import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;
    const { message } = await req.json();

    if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { routes: true, features: true, databaseTables: true },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });

    // Save user message
    await prisma.aiMessage.create({
      data: { project_id: projectId, user_id: user!.id, role: "user", message },
    });

    // Create Shang Tsung Context
    const systemPrompt = `
You are Shang Tsung, the Dojo Master and elite App Builder Strategist.
You are helping the user build an app called "${project.app_name}".
Purpose: ${project.app_description}

Current Routes: ${project.routes.map(r => r.page_name).join(", ")}
Current Features: ${project.features.map(f => f.feature_name).join(", ")}

Respond concisely. Offer strategic advice on what features or routes to add. 
Stay in character but be highly practical about app development. 
Keep responses under 3 paragraphs.
    `.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const aiText = response.choices[0]?.message?.content || "I have no response.";

    // Save AI message
    await prisma.aiMessage.create({
      data: { project_id: projectId, user_id: user!.id, role: "assistant", message: aiText },
    });

    return NextResponse.json({ success: true, text: aiText });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const messages = await prisma.aiMessage.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}