import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/projects/[id]/messages/[messageId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  await prisma.aiMessage.deleteMany({
    where: { id: messageId, project_id: id },
  });
  return Response.json({ ok: true });
}

// PATCH /api/projects/[id]/messages/[messageId]
// Toggles / sets the `pinned` flag inside the metadata JSON column.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { messageId } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const existing = await prisma.aiMessage.findUnique({
    where: { id: messageId },
  });
  const meta = (existing?.metadata as any) || {};
  const pinned =
    typeof body?.pinned === "boolean" ? body.pinned : !meta.pinned;

  const update: any = { metadata: { ...meta, pinned } };
  if (body?.rating === "red" || body?.rating === "orange" || body?.rating === "green") {
    update.metadata.rating = body.rating;
  }

  await prisma.aiMessage.update({
    where: { id: messageId },
    data: update,
  });

  return Response.json({ ok: true, pinned, rating: update.metadata.rating ?? null });
}
