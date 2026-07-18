import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editProjectCode } from "@/services/codeEditor";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: { files: { orderBy: { file_path: "asc" } } },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Save user message to database
    await prisma.aiMessage.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: user.id } },
        role: "user",
        message: message.trim(),
      },
    });

    if (project.files.length === 0) {
      const reply =
        "No files have been generated yet. Click Generate Code first, then I can edit the code for you.";

      await prisma.aiMessage.create({
        data: {
          project: { connect: { id: projectId } },
          user: { connect: { id: user.id } },
          role: "assistant",
          message: reply,
        },
      });

      return NextResponse.json({ reply, updatedFiles: [], filesChanged: 0 });
    }

    // Handle memory/history questions
    const lowerMessage = message.toLowerCase().trim();

    if (
      lowerMessage.includes("what did we") ||
      lowerMessage.includes("what have we") ||
      lowerMessage.includes("what changed") ||
      lowerMessage.includes("what was changed") ||
      lowerMessage.includes("history") ||
      lowerMessage.includes("remind me") ||
      lowerMessage.includes("last session") ||
      lowerMessage.includes("previously") ||
      lowerMessage.includes("last time") ||
      lowerMessage.includes("what did i ask")
    ) {
      // Load last 13 messages for context
      const recentMessages = await prisma.aiMessage.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: "desc" },
        take: 13,
        select: { role: true, message: true, created_at: true },
      });

      const history = recentMessages.reverse();
      const userMessages = history.filter((m) => m.role === "user");
      const assistantMessages = history.filter((m) => m.role === "assistant");

      if (userMessages.length === 0) {
        const reply = "This is our first conversation in The Forge. No history yet. Tell me what to change.";

        await prisma.aiMessage.create({
          data: {
            project: { connect: { id: projectId } },
            user: { connect: { id: user.id } },
            role: "assistant",
            message: reply,
          },
        });

        return NextResponse.json({ reply, updatedFiles: [], filesChanged: 0 });
      }

      const summary = [
        `Here is a summary of our recent Forge conversation for "${project.app_name}":`,
        "",
        ...userMessages.slice(0, 6).map((m, i) => `${i + 1}. You asked: "${m.message.slice(0, 80)}${m.message.length > 80 ? "..." : ""}"`),
        "",
        `Total: ${userMessages.length} instruction${userMessages.length !== 1 ? "s" : ""} given in this session.`,
        "",
        "What would you like to do next?",
      ].join("\n");

      await prisma.aiMessage.create({
        data: {
          project: { connect: { id: projectId } },
          user: { connect: { id: user.id } },
          role: "assistant",
          message: summary,
        },
      });

      return NextResponse.json({
        reply: summary,
        updatedFiles: [],
        filesChanged: 0,
      });
    }

    // Run code edit
    const result = await editProjectCode({
      instruction: message,
      files: project.files,
    });

    // Save assistant reply to database
    await prisma.aiMessage.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: user.id } },
        role: "assistant",
        message: result.reply,
      },
    });

    // Save updated files to database
    if (result.updatedFiles.length > 0) {
      await Promise.all(
        result.updatedFiles.map((file) =>
          prisma.projectFile.update({
            where: { id: file.id },
            data: { content: file.content },
          })
        )
      );
    }

    return NextResponse.json({
      reply: result.reply,
      updatedFiles: result.updatedFiles,
      filesChanged: result.updatedFiles.length,
    });
  } catch (error) {
    console.error("Forge chat error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Forge chat failed",
      },
      { status: 500 }
    );
  }
}