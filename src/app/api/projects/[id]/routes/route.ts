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

  const routes = await prisma.projectRoute.findMany({
    where: { project_id: id },
    orderBy: { sort_order: "asc" },
  });

  return NextResponse.json({ routes });
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
  const { page_name, route_path, purpose } = await req.json();

  const route = await prisma.projectRoute.create({
    data: {
      project: { connect: { id } },
      page_name,
      route_path,
      purpose,
      access_level: "registered",
      sort_order: 0,
    },
  });

  return NextResponse.json({ route });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, page_name, route_path, purpose } = await req.json();

  const route = await prisma.projectRoute.update({
    where: { id },
    data: { page_name, route_path, purpose },
  });

  return NextResponse.json({ route });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.projectRoute.delete({ where: { id } });

  return NextResponse.json({ success: true });
}