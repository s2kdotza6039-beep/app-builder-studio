import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, action, entity, data, id } = body;

    if (!projectId || !action || !entity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ========================
    // CREATE
    // ========================
    if (action === "create") {
      if (entity === "route") {
        const item = await prisma.projectRoute.create({
          data: {
            project_id: projectId,
            page_name: data?.page_name || "New Page",
            route_path: data?.route_path || "/new",
            purpose: data?.purpose || "",
            access_level: "registered",
            sort_order: 99,
          },
        });
        return NextResponse.json({ success: true, item });
      }

      if (entity === "feature") {
        const item = await prisma.projectFeature.create({
          data: {
            project_id: projectId,
            feature_name: data?.feature_name || "New Feature",
            priority: data?.priority || "Should Have",
            complexity: "Medium",
            status: "Planned",
          },
        });
        return NextResponse.json({ success: true, item });
      }

      if (entity === "database") {
        const item = await prisma.projectDatabaseTable.create({
          data: {
            project_id: projectId,
            table_name: data?.table_name || "new_table",
            purpose: data?.purpose || "",
            fields_json: [],
          },
        });
        return NextResponse.json({ success: true, item });
      }
    }

    // ========================
    // UPDATE
    // ========================
    if (action === "update") {
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

      if (entity === "route") {
        const item = await prisma.projectRoute.update({
          where: { id },
          data: {
            page_name: data?.page_name,
            route_path: data?.route_path,
            purpose: data?.purpose,
          },
        });
        return NextResponse.json({ success: true, item });
      }

      if (entity === "feature") {
        const item = await prisma.projectFeature.update({
          where: { id },
          data: {
            feature_name: data?.feature_name,
            priority: data?.priority,
          },
        });
        return NextResponse.json({ success: true, item });
      }

      if (entity === "database") {
        const item = await prisma.projectDatabaseTable.update({
          where: { id },
          data: {
            table_name: data?.table_name,
            purpose: data?.purpose,
          },
        });
        return NextResponse.json({ success: true, item });
      }
    }

    // ========================
    // DELETE
    // ========================
    if (action === "delete") {
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

      if (entity === "route") {
        await prisma.projectRoute.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      if (entity === "feature") {
        await prisma.projectFeature.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      if (entity === "database") {
        await prisma.projectDatabaseTable.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid action or entity" }, { status: 400 });
  } catch (error: any) {
    console.error("Sections API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}