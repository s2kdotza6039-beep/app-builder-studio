import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROJECT_LIMITS: Record<string, number> = {
  FREE: 3,
  PRO: 20,
  BUSINESS: 100,
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { projects: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check project limits
    if (user.role !== "ADMIN") {
      const limit = PROJECT_LIMITS[user.subscription_plan || "FREE"] || 3;
      if (user.projects.length >= limit) {
        return NextResponse.json(
          {
            error: `You have reached your ${user.subscription_plan} plan limit of ${limit} projects.`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { analysis, destination } = body;

    if (!analysis) {
      return NextResponse.json(
        { error: "No analysis data provided" },
        { status: 400 }
      );
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        user_id: user.id,
        app_name: analysis.app_name || "Imported Project",
        app_description: analysis.app_description || "Imported from existing codebase",
        app_type: analysis.app_type || "Custom App",
        complexity_level: "Standard App",
        target_users: "Existing project users",
        business_model: "To be determined",
        status: destination === "forge" ? "BUILDING" : "PLANNING",

        routes: {
          create: (analysis.detected_routes || []).map(
            (
              r: { page_name: string; route_path: string; purpose: string },
              i: number
            ) => ({
              page_name: r.page_name,
              route_path: r.route_path,
              purpose: r.purpose,
              access_level: "registered",
              sort_order: i,
            })
          ),
        },

        features: {
          create: (analysis.detected_features || []).map(
            (f: { feature_name: string; priority: string }) => ({
              feature_name: f.feature_name,
              priority: f.priority,
              complexity: "Medium",
              status: "Planned",
            })
          ),
        },

        databaseTables: {
          create: (analysis.detected_tables || []).map(
            (t: { table_name: string; purpose: string }) => ({
              table_name: t.table_name,
              purpose: t.purpose,
              fields_json: [
                { name: "id", type: "String" },
                { name: "created_at", type: "DateTime" },
              ],
            })
          ),
        },
      },
    });

    // If going to Forge, save uploaded files as ProjectFiles
    if (destination === "forge" && analysis.files?.length > 0) {
      const filesToSave = (analysis.files as Array<{
        file_path: string;
        content: string;
        language: string;
      }>).slice(0, 50);

      await Promise.allSettled(
        filesToSave.map((f) =>
          prisma.projectFile.create({
            data: {
              project: { connect: { id: project.id } },
              file_path: f.file_path,
              content: f.content,
              language: f.language,
            },
          })
        )
      );

      // Save initial version snapshot
      await prisma.projectVersion.create({
        data: {
          project: { connect: { id: project.id } },
          version_number: 1,
          label: "📌 Original imported code",
          instruction: `Imported from ${analysis.app_name} — original state preserved`,
          files_snapshot: filesToSave.map((f) => ({
            file_path: f.file_path,
            content: f.content,
            language: f.language,
          })),
        },
      });
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      destination,
    });
  } catch (error) {
    console.error("Import create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create project",
      },
      { status: 500 }
    );
  }
}