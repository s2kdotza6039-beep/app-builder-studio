import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/files
// Returns the full file list for the Code viewer.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const files = await prisma.projectFile.findMany({
    where: { project_id: id },
    orderBy: { file_path: "asc" },
  });

  return Response.json(
    files.map((f) => ({
      file_path: f.file_path,
      content: f.content,
      language: f.language,
    }))
  );
}
