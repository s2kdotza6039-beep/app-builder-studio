import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/messages
// Returns ALL messages for the project (oldest -> newest) with a derived
// `pinned` flag used by the History page and Shang Tsung's memory.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const msgs = await prisma.aiMessage.findMany({
    where: { project_id: id },
    orderBy: { created_at: "asc" },
  });

  return Response.json(
    msgs.map((m) => ({
      ...m,
      pinned: (m.metadata as any)?.pinned === true,
    }))
  );
}
