import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProjectCode } from "@/services/codeGenerator";

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

// GET: Fetch all generated files for a project
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 }
      );
    }

    const files = await prisma.projectFile.findMany({
      where: { project_id: projectId },
      orderBy: { file_path: "asc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Forge GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load files." },
      { status: 500 }
    );
  }
}

// POST: Generate fresh code files for the project
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: {
        routes: { orderBy: { sort_order: "asc" } },
        features: true,
        databaseTables: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 }
      );
    }

    const generatedFiles = await generateProjectCode({
      appName: project.app_name || "My App",
      appDescription: project.app_description || "An application generated in The Forge.",
      routes: project.routes,
      features: project.features,
      databaseTables: project.databaseTables,
    });

    const uniqueFiles = Array.from(
      new Map(generatedFiles.map((file) => [file.file_path, file])).values()
    );

    if (uniqueFiles.length === 0) {
      return NextResponse.json(
        { error: "The code generator returned no files." },
        { status: 500 }
      );
    }

    // Replace old generated files with the newly generated files cleanly
    await prisma.$transaction([
      prisma.projectFile.deleteMany({
        where: { project_id: projectId },
      }),
      ...uniqueFiles.map((file) =>
        prisma.projectFile.create({
          data: {
            project: { connect: { id: projectId } },
            file_path: file.file_path,
            content: file.content,
            language: file.language,
          },
        })
      ),
    ]);

    const savedFiles = await prisma.projectFile.findMany({
      where: { project_id: projectId },
      orderBy: { file_path: "asc" },
    });

    return NextResponse.json({
      success: true,
      filesGenerated: savedFiles.length,
      files: savedFiles,
    });
  } catch (error) {
    console.error("Forge POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Code generation failed." },
      { status: 500 }
    );
  }
}

// PUT: Save manual edits to a single file
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const body = await request.json();
    const { fileId, content } = body;

    if (!fileId || content === undefined) {
      return NextResponse.json(
        { error: "fileId and content required." },
        { status: 400 }
      );
    }

    const existingFile = await prisma.projectFile.findFirst({
      where: { id: fileId, project_id: projectId },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const file = await prisma.projectFile.update({
      where: { id: fileId },
      data: { content },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Forge PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save file." },
      { status: 500 }
    );
  }
}