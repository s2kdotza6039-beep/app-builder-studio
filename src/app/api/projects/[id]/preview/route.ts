import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePreviewHTML } from "@/services/previewGenerator";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
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

    const founderEmail =
      process.env.FOUNDER_EMAIL?.trim().toLowerCase() || "";
    const currentEmail =
      currentUser.email?.trim().toLowerCase() || "";

    const canAccessAnyProject =
      currentUser.role === "ADMIN" ||
      (founderEmail !== "" && currentEmail === founderEmail);

    const project = await prisma.project.findFirst({
      where: canAccessAnyProject
        ? { id: projectId }
        : { id: projectId, user_id: currentUser.id },
      include: {
        routes: { orderBy: { sort_order: "asc" } },
        features: true,
      },
    });

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    const html = generatePreviewHTML({
      appName: project.app_name || "My App",
      appDescription:
        project.app_description || "An amazing application.",
      routes: project.routes,
      features: project.features,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Preview error:", error);
    return new Response("Preview generation failed", {
      status: 500,
    });
  }
}