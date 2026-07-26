import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { editProjectCode } from "@/services/codeEditor";

// POST /api/projects/[id]/forge-chat
// Crash-proof: every Prisma call is guarded so a single DB error
// (connection drop, etc.) can NEVER stop Shang Tsung from replying.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const message: string = (body?.message || "").toString().trim();
  if (!message) {
    return Response.json({ ok: false, error: "Empty message" }, { status: 400 });
  }

  // Resolve owner id defensively.
  let userId =
    process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000000";
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { user_id: true },
    });
    if (project?.user_id) userId = project.user_id;
  } catch (e) {
    console.error("project lookup failed (continuing):", e);
  }

  // Build conversation history (best-effort).
  let history: { role: string; content: string }[] = [];
  try {
    const recent = await prisma.aiMessage.findMany({
      where: { project_id: id },
      orderBy: { created_at: "desc" },
      take: 30,
    });
    history = recent
      .reverse()
      .map((m) => ({ role: m.role, content: m.message }));
  } catch (e) {
    console.error("history load failed (continuing):", e);
  }

  // Gather pinned messages -> injected as persistent user context.
  let pinnedContext = "";
  try {
    const pinned = await prisma.aiMessage.findMany({
      where: { project_id: id, metadata: { path: ["pinned"], equals: true } },
      orderBy: { created_at: "asc" },
      take: 20,
    });
    pinnedContext = pinned
      .map((p) => `${p.role === "user" ? "USER" : "SHANG TSUNG"}: ${p.message}`)
      .join("\n\n");
  } catch (e) {
    console.error("pinned load failed (continuing):", e);
  }

  // Persist the user's message.
  try {
    await prisma.aiMessage.create({
      data: { project_id: id, user_id: userId, role: "user", message },
    });
  } catch (e) {
    console.error("user message save failed (continuing):", e);
  }

  // Run the engine.
  const result = await editProjectCode({
    projectId: id,
    userMessage: message,
    history,
    pinnedContext,
  });

  // Persist Shang Tsung's reply.
  try {
    await prisma.aiMessage.create({
      data: {
        project_id: id,
        user_id: userId,
        role: "assistant",
        message: result.reply,
        metadata: {
          filesChanged: result.filesChanged,
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
        },
      },
    });
  } catch (e) {
    console.error("assistant message save failed (continuing):", e);
  }

  // Always return a reply — never let a DB error 500 this route.
  return Response.json({
    ok: true,
    reply: result.reply,
    filesChanged: result.filesChanged,
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
  });
}
