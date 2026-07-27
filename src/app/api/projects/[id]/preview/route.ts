import { NextRequest } from "next/server";
import { prisma, isConnectionError } from "@/lib/prisma";
import { generatePreviewHTML } from "@/services/previewGenerator";

type PreviewFile = { file_path: string; content: string; language?: string };

// GET /api/projects/[id]/preview?path=/
// Returns a live, self-contained HTML preview of the project's files.
//
// Crash-proof: a single DB/engine error must NEVER result in a blank iframe.
// Neon-aware: the Prisma client retries a sleeping database automatically.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const requestedPath = normalizePath(
    new URL(req.url).searchParams.get("path") || "/"
  );

  let files: PreviewFile[] = [];

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
    const sleeping = isConnectionError(e);
    return htmlResponse(
      previewErrorHTML(
        sleeping
          ? "Your database is waking up and did not respond in time."
          : "Could not load your project's files from the database.",
        e instanceof Error ? e.message : String(e),
        sleeping
      )
    );
  }

  const routes = discoverRoutes(files);

  // ------------------------------------------------------------------
  // BUGFIX - "the preview just blinks".
  //
  // Previously this route read ?path= but never used it. It always called
  // generatePreviewHTML(files) unchanged, and previewGenerator's findEntry()
  // always picks app/page.tsx. So clicking Products reloaded the iframe (the
  // blink) and re-rendered the HOME page every single time.
  //
  // Fix: when a non-home page is requested we swap in a tiny synthetic
  // app/page.tsx that re-exports the requested page. The real page file stays
  // at its real path, so its own relative imports keep resolving correctly.
  // ------------------------------------------------------------------
  let filesForRender = files;

  if (requestedPath !== "/") {
    const target = findPageFile(files, requestedPath);

    if (!target) {
      return htmlResponse(
        missingPageHTML(requestedPath, routes)
      );
    }

    filesForRender = buildEntryOverride(files, target.file_path);
  }

  try {
    const html = generatePreviewHTML({ files: filesForRender });
    return htmlResponse(injectPreviewRouter(html, routes, requestedPath));
  } catch (e) {
    console.error("=== PREVIEW GENERATE ERROR ===", e);
    return htmlResponse(
      previewErrorHTML(
        "The preview engine hit an unexpected error while building the page.",
        e instanceof Error ? e.message : String(e),
        false
      )
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never let the browser serve a stale preview after an AI edit.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function normalizePath(p: string): string {
  let out = (p || "/").trim();
  if (!out.startsWith("/")) out = "/" + out;
  out = out.replace(/\/+/g, "/");
  if (out.length > 1) out = out.replace(/\/+$/, "");
  return out || "/";
}

// "app/about/page.tsx" -> "/about"    "app/page.tsx" -> "/"
function filePathToRoute(filePath: string): string | null {
  const m = filePath.match(/^app\/(.*\/)?page\.(tsx|jsx|ts|js)$/i);
  if (!m) return null;
  const dir = (m[1] || "").replace(/\/+$/, "");
  if (!dir) return "/";
  if (dir.includes("[")) return null; // dynamic routes can't be linked directly
  return "/" + dir;
}

function discoverRoutes(files: PreviewFile[]): string[] {
  return Array.from(
    new Set(
      files
        .map((f) => filePathToRoute(f.file_path))
        .filter((r): r is string => r !== null)
    )
  ).sort();
}

function findPageFile(files: PreviewFile[], route: string): PreviewFile | null {
  for (const f of files) {
    if (filePathToRoute(f.file_path) === route) return f;
  }
  return null;
}

/**
 * Replace app/page.tsx with a one-line re-export of the requested page so that
 * previewGenerator's findEntry() renders the page the user actually asked for.
 *
 * "app/products/page.tsx"  ->  entry becomes:  export { default } from "./products/page";
 *
 * The original page file is left untouched at its own path, so any relative
 * imports inside it (../components/Navbar, etc.) still resolve normally.
 */
function buildEntryOverride(
  files: PreviewFile[],
  targetPath: string
): PreviewFile[] {
  // "app/products/page.tsx" -> "./products/page"
  const specifier =
    "./" + targetPath.replace(/^app\//i, "").replace(/\.(tsx|jsx|ts|js)$/i, "");

  const entry: PreviewFile = {
    file_path: "app/page.tsx",
    language: "tsx",
    content:
      `// Auto-generated preview entry point.\n` +
      `// Renders ${targetPath} as the root of this preview.\n` +
      `export { default } from "${specifier}";\n`,
  };

  const rest = files.filter(
    (f) => f.file_path.toLowerCase() !== "app/page.tsx"
  );

  return [entry, ...rest];
}

/**
 * Injects a router + Back/Forward/Home toolbar into the generated preview HTML.
 * Without this, <a href="/products"> made the IFRAME navigate to the real dev
 * server (localhost:3000/products) which 404s.
 */
function injectPreviewRouter(
  html: string,
  routes: string[],
  currentPath: string
): string {
  const payload = JSON.stringify({ routes, currentPath }).replace(
    /</g,
    "\\u003c"
  );

  const script = `
<script>
(function () {
  var DATA = ${payload};
  var known = DATA.routes || [];
  var here = DATA.currentPath || "/";

  function norm(p) {
    if (!p) return "/";
    try { p = decodeURI(p); } catch (e) {}
    if (p.indexOf("#") === 0) return here;
    p = p.split("#")[0].split("?")[0];
    if (!p) return "/";
    if (p.charAt(0) !== "/") p = "/" + p;
    p = p.replace(/\\/+/g, "/");
    if (p.length > 1) p = p.replace(/\\/+$/, "");
    return p || "/";
  }

  function go(path) {
    var url = new URL(window.location.href);
    url.searchParams.set("path", path);
    url.searchParams.set("t", String(Date.now()));
    window.location.href = url.toString();
  }

  var bar = document.createElement("div");
  bar.setAttribute("data-preview-chrome", "1");
  bar.style.cssText = [
    "position:fixed","left:0","right:0","bottom:0","z-index:2147483647",
    "display:flex","align-items:center","gap:8px","padding:8px 12px",
    "background:rgba(15,23,42,.94)","backdrop-filter:blur(6px)",
    "border-top:1px solid #334155",
    "font:500 12px ui-sans-serif,system-ui,sans-serif","color:#e2e8f0"
  ].join(";");

  function btn(label, title, onClick) {
    var b = document.createElement("button");
    b.textContent = label; b.title = title;
    b.style.cssText = [
      "cursor:pointer","border:1px solid #475569","background:#1e293b",
      "color:#e2e8f0","border-radius:7px","padding:5px 11px",
      "font:600 12px ui-sans-serif,system-ui,sans-serif","line-height:1"
    ].join(";");
    b.onmouseenter = function () { b.style.background = "#334155"; };
    b.onmouseleave = function () { b.style.background = "#1e293b"; };
    b.onclick = onClick;
    return b;
  }

  bar.appendChild(btn("\\u2190", "Back", function () { history.back(); }));
  bar.appendChild(btn("\\u2192", "Forward", function () { history.forward(); }));
  bar.appendChild(btn("\\u2302 Home", "Go to home page", function () { go("/"); }));

  var label = document.createElement("span");
  label.textContent = here;
  label.style.cssText = "margin-left:4px;padding:4px 9px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#93c5fd;font-family:ui-monospace,monospace";
  bar.appendChild(label);

  if (known.length > 1) {
    var sel = document.createElement("select");
    sel.title = "Jump to a page";
    sel.style.cssText = "margin-left:auto;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:7px;padding:5px 9px;font:600 12px ui-sans-serif,system-ui,sans-serif;cursor:pointer";
    known.forEach(function (r) {
      var o = document.createElement("option");
      o.value = r; o.textContent = r;
      if (r === here) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () { go(sel.value); };
    bar.appendChild(sel);
  }

  function mount() {
    if (!document.body) return;
    document.body.appendChild(bar);
    document.body.style.paddingBottom = "52px";
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = [
      "position:fixed","left:50%","bottom:64px","transform:translateX(-50%)",
      "z-index:2147483647","max-width:82%",
      "background:#7c2d12","color:#fed7aa","border:1px solid #c2410c",
      "border-radius:9px","padding:10px 15px",
      "font:500 12px ui-sans-serif,system-ui,sans-serif",
      "box-shadow:0 8px 24px rgba(0,0,0,.45)"
    ].join(";");
    (document.body || document.documentElement).appendChild(t);
    setTimeout(function () { t.remove(); }, 4200);
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
    if (!a) return;
    if (a.closest("[data-preview-chrome]")) return;

    var raw = a.getAttribute("href");
    if (!raw) return;

    if (/^(https?:)?\\/\\//i.test(raw) || /^(mailto:|tel:)/i.test(raw)) {
      a.target = "_blank"; a.rel = "noopener noreferrer";
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    var target = norm(raw);
    if (target === here) return;

    if (known.indexOf(target) !== -1) go(target);
    else toast("This preview has no page at " + target +
               ". Ask Shang Tsung to create it, then it will appear here.");
  }, true);

  try {
    if (window.next && window.next.router) {
      window.next.router.push = function (p) {
        var t = norm(p); if (known.indexOf(t) !== -1) go(t);
      };
      window.next.router.replace = window.next.router.push;
    }
  } catch (e) {}
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "\n</body>");
  }
  return html + script;
}

function shell(title: string, color: string, bodyHTML: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<title>${title}</title>
<style>
  html,body{margin:0;padding:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
  .wrap{max-width:780px;margin:0 auto;padding:40px 24px}
  h2{color:${color};margin:0 0 10px}
  pre{background:#1e293b;color:#cbd5e1;padding:16px;border-radius:10px;white-space:pre-wrap;overflow:auto;font-size:13px}
  p{color:#94a3b8;line-height:1.5}
  a.btn{display:inline-block;margin-top:6px;margin-right:8px;padding:8px 14px;background:#1e293b;border:1px solid #475569;border-radius:8px;color:#e2e8f0;text-decoration:none;font-weight:600;font-size:13px}
  a.btn:hover{background:#334155}
  code{color:#93c5fd;font-family:ui-monospace,monospace}
  .spin{display:inline-block;width:14px;height:14px;border:2px solid #fbbf24;border-top-color:transparent;border-radius:50%;animation:s .8s linear infinite;margin-right:8px;vertical-align:middle}
  @keyframes s{to{transform:rotate(360deg)}}
</style></head><body><div class="wrap">${bodyHTML}</div></body></html>`;
}

function missingPageHTML(requestedPath: string, routes: string[]): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const links = routes.length
    ? routes
        .map(
          (r) =>
            `<a class="btn" href="?path=${encodeURIComponent(r)}">${safe(r)}</a>`
        )
        .join("")
    : `<p>This project has no pages yet.</p>`;

  return shell(
    "Page not found in preview",
    "#fbbf24",
    `<h2>No page at <code>${safe(requestedPath)}</code></h2>
     <p>Shang Tsung has not created this page yet. Ask for it in the chat, for example:</p>
     <pre>Create a page at ${safe(requestedPath)}</pre>
     <p>Pages that exist right now:</p>
     ${links}`
  );
}

function previewErrorHTML(
  title: string,
  detail: string,
  sleeping: boolean
): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const autoReload = sleeping
    ? `<script>setTimeout(function(){location.reload();},3000);</script>`
    : "";

  const advice = sleeping
    ? "Your Neon database went to sleep after 5 minutes of inactivity (normal on the free plan). It is waking up now. This page will retry automatically in 3 seconds."
    : "If this mentions a database or connection, restart your dev server and make sure your database is running and DATABASE_URL is set. Then hard-refresh the preview (Ctrl+F5).";

  const heading = sleeping
    ? "Waking up your database..."
    : "Preview could not load";

  const body = `<h2>${
    sleeping ? '<span class="spin"></span>' : "&#129504; "
  }${safe(heading)}</h2>
<p>${safe(title)}</p>
<pre>${safe(detail)}</pre>
<p>${safe(advice)}</p>${autoReload}`;

  return shell("Preview error", sleeping ? "#fbbf24" : "#f87171", body);
}
