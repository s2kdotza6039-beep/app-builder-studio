import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePreviewHTML } from "@/services/previewGenerator";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return new Response("User not found", { status: 404 });
    }

    const { id: projectId } = await context.params;

    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase() || "";
    const currentEmail = currentUser.email?.trim().toLowerCase() || "";
    const canAccessAnyProject =
      currentUser.role === "ADMIN" ||
      (founderEmail !== "" && currentEmail === founderEmail);

    // CRITICAL: Load project WITH files AND planning data
    const project = await prisma.project.findFirst({
      where: canAccessAnyProject
        ? { id: projectId }
        : { id: projectId, user_id: currentUser.id },
      include: {
        routes: { orderBy: { sort_order: "asc" } },
        features: true,
        databaseTables: true,
        files: { orderBy: { file_path: "asc" } }, // ← ALL generated files
      },
    });

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const currentPath = searchParams.get("path") || "/";

    // Log for debugging
    console.log("Preview requested for path:", currentPath);
    console.log("Files in project:", project.files.map((f) => f.file_path));
    console.log("Files count:", project.files.length);

    const html = generatePreviewHTML(
      {
        appName: project.app_name || "My App",
        appDescription: project.app_description || "An amazing application.",
        routes: project.routes,
        features: project.features,
        databaseTables: project.databaseTables,
      },
      currentPath,
      project.files // ← Pass actual files to the generator
    );

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("Preview error:", error);
    return new Response("Preview generation failed", { status: 500 });
  }
}