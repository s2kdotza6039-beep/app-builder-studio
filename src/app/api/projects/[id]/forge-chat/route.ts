import { NextRequest } from "next/server";
import { prisma, withRetry, withRetrySafe, isConnectionError } from "@/lib/prisma";
import { editProjectCode, type EditResult } from "@/services/codeEditor";

type HistoryEntry = { role: string; content: string };

// POST /api/projects/[id]/forge-chat
//
// Crash-proof: every Prisma call is guarded so a single DB error
// (connection drop, Neon sleeping, etc.) can NEVER stop Shang Tsung from replying.
//
// Neon-aware: the free plan suspends the database after 5 minutes idle.
// withRetry waits for the ~150-500ms wake-up instead of failing instantly.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessage = (body as { message?: unknown } | null)?.message;
  const message: string = (rawMessage ?? "").toString().trim();
  if (!message) {
    return Response.json({ ok: false, error: "Empty message" }, { status: 400 });
  }

  // ---------------------------------------------------------------------
  // Resolve owner id.
  //
  // This one MUST retry. If we fall through to the placeholder UUID, every
  // aiMessage.create below fails a foreign-key check and your chat history
  // silently stops saving - the messages just vanish with no error on screen.
  // ---------------------------------------------------------------------
  let userId = process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000000";
  let ownerResolved = false;

  try {
    const project = await withRetry(
      () =>
        prisma.project.findUnique({
          where: { id },
          select: { user_id: true },
        }),
      { label: `forge-chat:project:${id}` }
    );

    if (project?.user_id) {
      userId = project.user_id;
      ownerResolved = true;
    } else {
      console.error(`forge-chat: project ${id} not found in database.`);
    }
  } catch (e) {
    console.error("project lookup failed (continuing):", e);
  }

  if (!ownerResolved) {
    console.warn(
      "forge-chat: could not resolve project owner. " +
        "Chat messages will NOT be saved for this request."
    );
  }

  // Build conversation history (best-effort - empty history still lets the AI reply).
  const recent = await withRetrySafe(
    () =>
      prisma.aiMessage.findMany({
        where: { project_id: id },
        orderBy: { created_at: "desc" },
        take: 30,
      }),
    [],
    { label: `forge-chat:history:${id}` }
  );

  const history: HistoryEntry[] = recent
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.message }));

  // Gather pinned messages -> injected as persistent user context.
  const pinned = await withRetrySafe(
    () =>
      prisma.aiMessage.findMany({
        where: { project_id: id, metadata: { path: ["pinned"], equals: true } },
        orderBy: { created_at: "asc" },
        take: 20,
      }),
    [],
    { label: `forge-chat:pinned:${id}` }
  );

  const pinnedContext = pinned
    .map((p) => `${p.role === "user" ? "USER" : "SHANG TSUNG"}: ${p.message}`)
    .join("\n\n");

  // Persist the user's message. Skipped if we never resolved a real owner,
  // because a foreign-key failure would just be noise in the logs.
  if (ownerResolved) {
    try {
      await withRetry(
        () =>
          prisma.aiMessage.create({
            data: { project_id: id, user_id: userId, role: "user", message },
          }),
        { label: `forge-chat:saveUser:${id}` }
      );
    } catch (e) {
      console.error("user message save failed (continuing):", e);
    }
  }

  // ---------------------------------------------------------------------
  // Run the engine.
  //
  // BUGFIX: this call was previously NOT wrapped in try/catch. The header
  // comment promised the route was crash-proof, but if editProjectCode threw
  // - OpenAI timeout, malformed JSON from the model, a DB write inside the
  // engine hitting a sleeping Neon compute - the whole route returned a 500
  // with an empty body. The browser then tried to parse that as JSON and blew
  // up with the exact error you reported:
  //
  //   "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
  //
  // Now the engine is guarded and we always return valid JSON.
  // ---------------------------------------------------------------------
  // Typed from the engine's own EditResult so this can never drift out of sync.
  let result: EditResult;

  try {
    result = await editProjectCode({
      projectId: id,
      userMessage: message,
      history,
      pinnedContext,
    });
  } catch (e) {
    console.error("=== FORGE ENGINE ERROR ===", e);

    const detail = e instanceof Error ? e.message : String(e);
    const sleeping = isConnectionError(e);

    return Response.json(
      {
        ok: false,
        reply: sleeping
          ? "Your database was waking up and I could not finish that change. " +
            "Give it a few seconds and send your message again - it should work on the second try."
          : `I hit an error while working on your code and stopped before changing anything.\n\n` +
            `**What went wrong:** ${detail}\n\n` +
            `Nothing in your project was modified. Try rephrasing your request, ` +
            `or send it again if this looks like a temporary glitch.`,
        error: detail,
        filesChanged: 0,
        created: 0,
        updated: 0,
        deleted: 0,
      },
      { status: 200 }
    );
  }

  // Persist Shang Tsung's reply.
  if (ownerResolved) {
    try {
      await withRetry(
        () =>
          prisma.aiMessage.create({
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
          }),
        { label: `forge-chat:saveAssistant:${id}` }
      );
    } catch (e) {
      console.error("assistant message save failed (continuing):", e);
    }
  }

  // Always return a reply - never let a DB error 500 this route.
  return Response.json({
    ok: true,
    reply: result.reply,
    filesChanged: result.filesChanged,
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
  });
}
