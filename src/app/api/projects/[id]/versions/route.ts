import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_VERSIONS = 20;

// ─── GET: Fetch all versions ──────────────────────────────────────────────────
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const versions = await prisma.projectVersion.findMany({
      where: { project_id: projectId },
      orderBy: { version_number: "desc" },
      select: {
        id: true,
        version_number: true,
        label: true,
        instruction: true,
        created_at: true,
      },
    });

    // Separate pinned from unpinned using label prefix
    const formatted = versions.map((v) => ({
      ...v,
      pinned: v.label?.startsWith("📌 ") || false,
    }));

    return NextResponse.json({ versions: formatted });
  } catch (error) {
    console.error("Versions GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

// ─── POST: Save a new version snapshot ───────────────────────────────────────
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const { label, instruction } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: { files: { orderBy: { file_path: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (project.files.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No files to snapshot" });
    }

    // Get the next version number
    const lastVersion = await prisma.projectVersion.findFirst({
      where: { project_id: projectId },
      orderBy: { version_number: "desc" },
      select: { version_number: true },
    });
    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    // Create the snapshot
    const version = await prisma.projectVersion.create({
      data: {
        project: { connect: { id: projectId } },
        version_number: nextVersionNumber,
        label: label || `Version ${nextVersionNumber}`,
        instruction: instruction || null,
        files_snapshot: project.files.map((f) => ({
          file_path: f.file_path,
          content: f.content,
          language: f.language,
        })),
      },
    });

    // Auto-cleanup: delete oldest unpinned versions beyond MAX_VERSIONS
    await autoCleanup(projectId);

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        version_number: version.version_number,
        label: version.label,
        instruction: version.instruction,
        created_at: version.created_at,
        pinned: false,
      },
    });
  } catch (error) {
    console.error("Version save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save version" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a specific version OR clear all unpinned ─────────────────
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const { versionId, clearAll } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (clearAll) {
      // Delete all unpinned versions
      const allVersions = await prisma.projectVersion.findMany({
        where: { project_id: projectId },
        select: { id: true, label: true },
      });

      const unpinnedIds = allVersions
        .filter((v) => !v.label?.startsWith("📌 "))
        .map((v) => v.id);

      await prisma.projectVersion.deleteMany({
        where: { id: { in: unpinnedIds } },
      });

      return NextResponse.json({
        success: true,
        deleted: unpinnedIds.length,
      });
    }

    if (versionId) {
      await prisma.projectVersion.deleteMany({
        where: { id: versionId, project_id: projectId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (error) {
    console.error("Version delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    );
  }
}

// ─── PATCH: Pin or unpin a version ───────────────────────────────────────────
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const { versionId, pin, customLabel } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const version = await prisma.projectVersion.findFirst({
      where: { id: versionId, project_id: projectId },
    });
    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const currentLabel = version.label || "";
    const baseLabel = currentLabel.startsWith("📌 ")
      ? currentLabel.slice(3)
      : currentLabel;

    const newLabel = pin
      ? `📌 ${customLabel || baseLabel}`
      : baseLabel;

    const updated = await prisma.projectVersion.update({
      where: { id: versionId },
      data: { label: newLabel },
    });

    return NextResponse.json({
      success: true,
      version: {
        id: updated.id,
        label: updated.label,
        pinned: updated.label?.startsWith("📌 ") || false,
      },
    });
  } catch (error) {
    console.error("Version pin error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    );
  }
}

// ─── AUTO CLEANUP ─────────────────────────────────────────────────────────────
async function autoCleanup(projectId: string) {
  try {
    const allVersions = await prisma.projectVersion.findMany({
      where: { project_id: projectId },
      orderBy: { version_number: "desc" },
      select: { id: true, label: true, version_number: true },
    });

    const unpinned = allVersions.filter((v) => !v.label?.startsWith("📌 "));

    if (unpinned.length > MAX_VERSIONS) {
      const toDelete = unpinned.slice(MAX_VERSIONS).map((v) => v.id);
      await prisma.projectVersion.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  } catch (error) {
    console.error("Auto cleanup error:", error);
  }
}