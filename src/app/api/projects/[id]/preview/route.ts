import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePreviewHTML } from "@/services/previewGenerator";

// GET /api/projects/[id]/preview?path=/
// Returns a live, self-contained HTML preview of the project's files.
//
// Crash-proof: a single DB/engine error must NEVER result in a blank iframe.
// If anything fails we return a readable error page so the cause is visible.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let files: { file_path: string; content: string; language?: string }[] = [];
  try {
    const rows = await prisma.projectFile.findMany({
      where: { project_id: id },
      orderBy: { file_path: "asc" },
    });
    files = rows.map((f) => ({
      file_path: f.file_path,
      content: f.content,
      language: f.language,
    }));
  } catch (e) {
    console.error("=== PREVIEW DB ERROR ===", e);
    return new Response(
      previewErrorHTML(
        "Could not load your project's files from the database.",
        e instanceof Error ? e.message : String(e)
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const html = generatePreviewHTML({ files });
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("=== PREVIEW GENERATE ERROR ===", e);
    return new Response(
      previewErrorHTML(
        "The preview engine hit an unexpected error while building the page.",
        e instanceof Error ? e.message : String(e)
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function previewErrorHTML(title: string, detail: string): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<title>Preview error</title>
<style>
  html,body{margin:0;padding:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
  .wrap{max-width:780px;margin:0 auto;padding:40px 24px}
  h2{color:#f87171;margin:0 0 10px}
  pre{background:#1e293b;color:#cbd5e1;padding:16px;border-radius:10px;white-space:pre-wrap;overflow:auto;font-size:13px}
  p{color:#94a3b8;line-height:1.5}
</style></head>
<body><div class="wrap">
<h2>🧠 Preview could not load</h2>
<p>${safe(title)}</p>
<pre>${safe(detail)}</pre>
<p>If this mentions a database or connection, restart your dev server and make sure your database is running and DATABASE_URL is set. Then hard-refresh the preview (Ctrl+F5).</p>
</div></body></html>`;
}
