import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch all projects for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const projects = await prisma.project.findMany({
      where: { user_id: user.id },
      orderBy: { updated_at: "desc" },
      include: {
        _count: {
          select: {
            files: true,
            routes: true,
            features: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load projects" },
      { status: 500 }
    );
  }
}

// POST: Create a brand new project
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { app_name, app_description, app_type } = body;

    if (!app_name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        user_id: user.id,
        app_name: app_name.trim(),
        app_description: app_description || "A custom application created in App Builder Studio.",
        app_type: app_type || "Custom SaaS",
        status: "IDEA",
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create project" },
      { status: 500 }
    );
  }
}