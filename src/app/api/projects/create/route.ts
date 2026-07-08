import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAppPlan } from "@/services/ai";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { idea, appType, complexity } = await req.json();
    if (!idea || !appType || !complexity) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const plan = await generateAppPlan(idea, appType, complexity);

    const project = await prisma.project.create({
      data: {
        user_id: user.id,
        app_name: plan.app_name,
        app_description: plan.app_purpose,
        app_type: appType,
        complexity_level: complexity,
        target_users: plan.target_users,
        business_model: plan.business_model,
        status: "PLANNING",
        routes: {
          create: plan.pages.map((p, i) => ({
            page_name: p.page_name,
            route_path: p.route_path,
            purpose: p.purpose,
            access_level: "registered",
            sort_order: i,
          })),
        },
        features: {
          create: plan.main_features.map((f) => ({
            feature_name: f,
            priority: "Should Have",
            complexity: "Medium",
            status: "Planned",
          })),
        },
        databaseTables: {
          create: plan.database_tables.map((t) => ({
            table_name: t.table_name,
            purpose: t.purpose,
            fields_json: t.fields.map((name) => ({ name, type: "String" })),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error: any) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}