import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const features = await prisma.projectFeature.findMany({
    where: { project_id: id },
  });

  return NextResponse.json({ features });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { feature_name, priority, complexity } = await req.json();

  const feature = await prisma.projectFeature.create({
    data: {
      project: { connect: { id } },
      feature_name,
      priority: priority || "Should Have",
      complexity: complexity || "Medium",
      status: "Planned",
    },
  });

  return NextResponse.json({ feature });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, feature_name, priority, complexity } = await req.json();

  const feature = await prisma.projectFeature.update({
    where: { id },
    data: { feature_name, priority, complexity },
  });

  return NextResponse.json({ feature });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.projectFeature.delete({ where: { id } });

  return NextResponse.json({ success: true });
}