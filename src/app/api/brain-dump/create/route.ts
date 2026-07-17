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
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || !body.project) {
      return NextResponse.json(
        { error: "No project plan was provided." },
        { status: 400 }
      );
    }

    const plan = body.project;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { projects: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please sign in again." },
        { status: 404 }
      );
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

    // Validate the plan has minimum required fields
    if (!plan.app_name && !plan.app_description) {
      return NextResponse.json(
        { error: "The project plan is missing required fields." },
        { status: 400 }
      );
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        user_id: user.id,
        app_name: plan.app_name || "Untitled App",
        app_description: plan.app_description || "",
        app_type: plan.app_type || "Business App",
        complexity_level: "Simple MVP",
        target_users: plan.target_users || "",
        business_model: plan.business_model || "",
        status: "PLANNING",

        routes: {
          create: Array.isArray(plan.routes)
            ? plan.routes.map(
                (
                  r: {
                    page_name: string;
                    route_path: string;
                    purpose: string;
                  },
                  i: number
                ) => ({
                  page_name: r.page_name || "Page",
                  route_path: r.route_path || `/${i}`,
                  purpose: r.purpose || "",
                  access_level: "registered",
                  sort_order: i,
                })
              )
            : [],
        },

        features: {
          create: Array.isArray(plan.features)
            ? plan.features.map(
                (f: { feature_name: string; priority: string }) => ({
                  feature_name: f.feature_name || "Feature",
                  priority: f.priority || "Should Have",
                  complexity: "Medium",
                  status: "Planned",
                })
              )
            : [],
        },

        databaseTables: {
          create: Array.isArray(plan.database_tables)
            ? plan.database_tables.map(
                (t: { table_name: string; purpose: string }) => ({
                  table_name: t.table_name || "table",
                  purpose: t.purpose || "",
                  fields_json: [
                    { name: "id", type: "String" },
                    { name: "created_at", type: "DateTime" },
                  ],
                })
              )
            : [],
        },
      },
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
    });
  } catch (error) {
    console.error("Brain dump create error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create project.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}