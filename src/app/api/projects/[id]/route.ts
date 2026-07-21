import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch single project with full details
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: {
        routes: { orderBy: { sort_order: "asc" } },
        features: true,
        databaseTables: true,
        files: { orderBy: { file_path: "asc" } },
        versions: { orderBy: { version_number: "desc" }, take: 10 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET Project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch project data" },
      { status: 500 }
    );
  }
}

// PUT: Update project settings / status / name
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { app_name, app_description, app_type, status } = body;

    const existing = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(app_name && { app_name }),
        ...(app_description !== undefined && { app_description }),
        ...(app_type && { app_type }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("PUT Project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update project" },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete project and clean up related child tables without interactive transaction timeouts!
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Verify ownership before deleting
    const existingProject = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      select: { id: true, app_name: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or you lack authorization to delete it" },
        { status: 404 }
      );
    }

    // 1. Delete all related child records concurrently outside of strict interactive timeout limits
    await Promise.allSettled([
      prisma.projectFile.deleteMany({ where: { project_id: projectId } }),
      prisma.projectRoute.deleteMany({ where: { project_id: projectId } }),
      prisma.projectFeature.deleteMany({ where: { project_id: projectId } }),
      prisma.projectDatabaseTable.deleteMany({ where: { project_id: projectId } }),
      prisma.projectVersion.deleteMany({ where: { project_id: projectId } }),
      prisma.aiMessage.deleteMany({ where: { project_id: projectId } }),
      prisma.activityLog.deleteMany({ where: { project_id: projectId } }),
      prisma.export.deleteMany({ where: { project_id: projectId } }),
    ]);

    // 2. Finally, delete the parent project record safely
    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({
      success: true,
      message: `Project "${existingProject.app_name}" deleted successfully.`,
      deletedId: projectId,
    });
  } catch (error) {
    console.error("DELETE Project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project securely" },
      { status: 500 }
    );
  }
}