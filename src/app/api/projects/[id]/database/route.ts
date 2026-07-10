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

  const tables = await prisma.projectDatabaseTable.findMany({
    where: { project_id: id },
  });

  return NextResponse.json({ tables });
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
  const { table_name, purpose, fields } = await req.json();

  const table = await prisma.projectDatabaseTable.create({
    data: {
      project: { connect: { id } },
      table_name,
      purpose,
      fields_json: fields || [],
    },
  });

  return NextResponse.json({ table });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, table_name, purpose, fields } = await req.json();

  const table = await prisma.projectDatabaseTable.update({
    where: { id },
    data: { table_name, purpose, fields_json: fields },
  });

  return NextResponse.json({ table });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.projectDatabaseTable.delete({ where: { id } });

  return NextResponse.json({ success: true });
}