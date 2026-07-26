import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const assets = await prisma.userAsset.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, asset_type, mime_type, data } = await req.json();
  if (!name || !data) {
    return NextResponse.json({ error: "Missing name or data" }, { status: 400 });
  }
  const asset = await prisma.userAsset.create({
    data: {
      user_id: user.id,
      name,
      asset_type: asset_type || "image",
      mime_type: mime_type || "application/octet-stream",
      data,
    },
  });
  return NextResponse.json({ asset });
}
