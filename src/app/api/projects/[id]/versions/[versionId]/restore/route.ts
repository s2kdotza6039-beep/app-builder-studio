import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, versionId } = await context.params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: { files: { orderBy: { file_path: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const version = await prisma.projectVersion.findFirst({
      where: { id: versionId, project_id: projectId },
    });
    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // Auto-save current state before restoring
    if (project.files.length > 0) {
      const lastVersion = await prisma.projectVersion.findFirst({
        where: { project_id: projectId },
        orderBy: { version_number: "desc" },
        select: { version_number: true },
      });

      await prisma.projectVersion.create({
        data: {
          project: { connect: { id: projectId } },
          version_number: (lastVersion?.version_number || 0) + 1,
          label: `Auto-save before restoring to ${version.label}`,
          instruction: `Automatic backup created before restore`,
          files_snapshot: project.files.map((f) => ({
            file_path: f.file_path,
            content: f.content,
            language: f.language,
          })),
        },
      });
    }

    // Parse the snapshot
    const snapshot = version.files_snapshot as Array<{
      file_path: string;
      content: string;
      language: string;
    }>;

    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      return NextResponse.json(
        { error: "Version snapshot is empty or invalid" },
        { status: 400 }
      );
    }

    // Replace current files with the snapshot
    await prisma.projectFile.deleteMany({
      where: { project_id: projectId },
    });

    const restoredFiles = await Promise.all(
      snapshot.map((f) =>
        prisma.projectFile.create({
          data: {
            project: { connect: { id: projectId } },
            file_path: f.file_path,
            content: f.content,
            language: f.language,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Restored to "${version.label}"`,
      filesRestored: restoredFiles.length,
      files: restoredFiles,
    });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore" },
      { status: 500 }
    );
  }
}