import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editProjectCode } from "@/services/codeEditor";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: projectId } = await context.params;
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Load project and all generated files
    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: { files: { orderBy: { file_path: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.files.length === 0) {
      return NextResponse.json({
        reply: "No files have been generated yet. Click Generate Code first, then I can edit the code for you.",
        updatedFiles: [],
      });
    }

    // Ask Shang Tsung to edit the code
    const result = await editProjectCode({
      instruction: message,
      files: project.files,
    });

    // Save any modified files back to the database
    if (result.updatedFiles.length > 0) {
      await Promise.all(
        result.updatedFiles.map((file) =>
          prisma.projectFile.update({
            where: { id: file.id },
            data: { content: file.content },
          })
        )
      );
    }

    return NextResponse.json({
      reply: result.reply,
      updatedFiles: result.updatedFiles,
      filesChanged: result.updatedFiles.length,
    });
  } catch (error) {
    console.error("Forge chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forge chat failed" },
      { status: 500 }
    );
  }
}