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
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: {
        files: { orderBy: { file_path: "asc" } },
        routes: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Save user message to chat history
    await prisma.aiMessage.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: user.id } },
        role: "user",
        message: message.trim(),
      },
    });

    if (project.files.length === 0) {
      const reply = "No files generated yet. Click Generate Code first before chatting.";
      await prisma.aiMessage.create({
        data: {
          project: { connect: { id: projectId } },
          user: { connect: { id: user.id } },
          role: "assistant",
          message: reply,
        },
      });
      return NextResponse.json({ reply, updatedFiles: [], newFiles: [], filesChanged: 0 });
    }

    // 2. Handle memory, summary, and history questions locally without triggering code generation
    const lowerMessage = message.toLowerCase().trim();
    if (
      lowerMessage.includes("what did we") ||
      lowerMessage.includes("what changes") ||
      lowerMessage.includes("what changed") ||
      lowerMessage.includes("last session") ||
      lowerMessage.includes("remind me") ||
      lowerMessage.includes("summarize") ||
      lowerMessage.includes("summary") ||
      lowerMessage.includes("history") ||
      lowerMessage.includes("what have we")
    ) {
      const recentMessages = await prisma.aiMessage.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: "desc" },
        take: 15,
        select: { role: true, message: true },
      });

      const userMessages = recentMessages.filter((m) => m.role === "user");
      const summary =
        userMessages.length === 0
          ? "No changes yet in this session. Tell me what to change or create."
          : [
              `Here is the summary of what we worked on for "${project.app_name}":`,
              "",
              ...userMessages.slice(0, 8).map((m, i) => `${i + 1}. "${m.message.slice(0, 90)}${m.message.length > 90 ? "..." : ""}"`),
              "",
              "What would you like to build or modify next?",
            ].join("\n");

      await prisma.aiMessage.create({
        data: {
          project: { connect: { id: projectId } },
          user: { connect: { id: user.id } },
          role: "assistant",
          message: summary,
        },
      });
      return NextResponse.json({ reply: summary, updatedFiles: [], newFiles: [], filesChanged: 0 });
    }

    // 3. Run Shang Tsung AI Editor (`codeEditor.ts`)
    const result = await editProjectCode({
      instruction: message,
      files: project.files,
    });

    console.log("=== FORGE CHAT DEBUG ===");
    console.log("Instruction:", message);
    console.log("Updated files count:", result.updatedFiles.length);
    console.log("New files count:", result.newFiles.length);
    console.log("=== END DEBUG ===");

    // 4. Save assistant reply to database
    await prisma.aiMessage.create({
      data: {
        project: { connect: { id: projectId } },
        user: { connect: { id: user.id } },
        role: "assistant",
        message: result.reply,
      },
    });

    // 5. Update existing files in database
    if (result.updatedFiles.length > 0) {
      for (const file of result.updatedFiles) {
        await prisma.projectFile.update({
          where: { id: file.id },
          data: { content: file.content },
        });
      }
    }

    // 6. Create new files in database & auto-register new routes
    const createdDbFiles = [];
    if (result.newFiles.length > 0) {
      for (const newFile of result.newFiles) {
        const existing = await prisma.projectFile.findFirst({
          where: { project_id: projectId, file_path: newFile.file_path },
        });

        if (existing) {
          const updated = await prisma.projectFile.update({
            where: { id: existing.id },
            data: { content: newFile.content },
          });
          createdDbFiles.push(updated);
        } else {
          const created = await prisma.projectFile.create({
            data: {
              project: { connect: { id: projectId } },
              file_path: newFile.file_path,
              content: newFile.content,
              language: newFile.language || "typescript",
            },
          });
          createdDbFiles.push(created);

          // If the new file is an app/[route]/page.tsx, auto-register it in ProjectRoutes!
          if (newFile.file_path.startsWith("app/") && newFile.file_path.endsWith("/page.tsx") && newFile.file_path !== "app/page.tsx") {
            const routePath = "/" + newFile.file_path.replace(/^app\//, "").replace(/\/page\.tsx$/, "");
            const pageName = routePath
              .replace(/^\//, "")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());

            const existingRoute = project.routes.find((r) => r.route_path.toLowerCase() === routePath.toLowerCase());
            if (!existingRoute) {
              await prisma.projectRoute.create({
                data: {
                  project: { connect: { id: projectId } },
                  page_name: pageName || "New Page",
                  route_path: routePath,
                  purpose: `Generated by Shang Tsung in The Forge (${pageName})`,
                  access_level: "registered",
                  sort_order: project.routes.length,
                },
              });
            }
          }
        }
      }
    }

    const totalChanged = result.updatedFiles.length + createdDbFiles.length;

    // 7. Auto-save Version History snapshot after changes
    if (totalChanged > 0) {
      const allUpdatedFiles = await prisma.projectFile.findMany({
        where: { project_id: projectId },
        orderBy: { file_path: "asc" },
      });

      const lastVersion = await prisma.projectVersion.findFirst({
        where: { project_id: projectId },
        orderBy: { version_number: "desc" },
      });

      await prisma.projectVersion.create({
        data: {
          project: { connect: { id: projectId } },
          version_number: (lastVersion?.version_number || 0) + 1,
          label: `⚡ Shang Tsung: ${message.slice(0, 35)}${message.length > 35 ? "..." : ""}`,
          instruction: message,
          files_snapshot: allUpdatedFiles.map((f) => ({
            file_path: f.file_path,
            content: f.content,
            language: f.language,
          })),
        },
      });
    }

    return NextResponse.json({
      reply: result.reply,
      updatedFiles: result.updatedFiles,
      newFiles: result.newFiles,
      filesChanged: totalChanged,
    });
  } catch (error) {
    console.error("Forge chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forge chat failed" },
      { status: 500 }
    );
  }
}