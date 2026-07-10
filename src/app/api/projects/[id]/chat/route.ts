import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USE_MOCK = true; // ← Change to false when OpenAI funds arrive

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Load full project context
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        routes: true,
        features: true,
        databaseTables: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Save user message to DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    await prisma.aiMessage.create({
      data: {
        project: { connect: { id } },
        user: { connect: { id: user!.id } },
        role: "user",
        message,
      },
    });

    // Generate response
    let reply = "";
    let action = null;

    if (USE_MOCK) {
      const result = generateMockResponse(message, project);
      reply = result.reply;
      action = result.action;
    } else {
      reply = await generateAIResponse(message, project);
    }

    // Save assistant message to DB
    await prisma.aiMessage.create({
      data: {
        project: { connect: { id } },
        user: { connect: { id: user!.id } },
        role: "assistant",
        message: reply,
      },
    });

    // Execute action if Shang Tsung decided to add something
    if (action) {
      await executeAction(id, action);
    }

    return NextResponse.json({ reply, action });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const messages = await prisma.aiMessage.findMany({
    where: { project_id: id },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ messages });
}

// MOCK RESPONSE ENGINE
function generateMockResponse(
  message: string,
  project: any
): { reply: string; action: any } {
  const msg = message.toLowerCase();

  // Add feature intent
  if (msg.includes("add") && msg.includes("feature")) {
    const featureName = extractFeatureName(message);
    return {
      reply: `I've added "${featureName}" to your features list. You can edit the priority and complexity directly on the page.`,
      action: { type: "ADD_FEATURE", data: { feature_name: featureName, priority: "Should Have", complexity: "Medium" } },
    };
  }

  // Add route intent
  if (msg.includes("add") && (msg.includes("route") || msg.includes("page"))) {
    const routeName = extractRouteName(message);
    return {
      reply: `I've added a "${routeName}" page to your routes. You can edit the path and purpose directly on the page.`,
      action: { type: "ADD_ROUTE", data: { page_name: routeName, route_path: `/${routeName.toLowerCase().replace(/\s/g, "-")}`, purpose: `${routeName} page` } },
    };
  }

  // Add database table intent
  if (msg.includes("add") && (msg.includes("table") || msg.includes("database"))) {
    const tableName = extractTableName(message);
    return {
      reply: `I've added a "${tableName}" table to your database structure. You can add fields directly on the page.`,
      action: { type: "ADD_TABLE", data: { table_name: tableName, purpose: `Stores ${tableName} data`, fields: [{ name: "id", type: "String" }, { name: "created_at", type: "DateTime" }] } },
    };
  }

  // Project summary intent
  if (msg.includes("summary") || msg.includes("overview") || msg.includes("what")) {
    return {
      reply: `Here is a summary of "${project.app_name}":\n\n📱 Purpose: ${project.app_description}\n🎯 Target Users: ${project.target_users || "Not specified"}\n📄 Pages: ${project.routes?.length || 0} routes\n⚡ Features: ${project.features?.length || 0} features\n🗄️ Database: ${project.databaseTables?.length || 0} tables\n💰 Business Model: ${project.business_model || "Not specified"}\n\nWhat would you like to improve?`,
      action: null,
    };
  }

  // Advice intent
  if (msg.includes("suggest") || msg.includes("recommend") || msg.includes("improve")) {
    return {
      reply: `Based on your app "${project.app_name}", here are my recommendations:\n\n1. Make sure you have user authentication in your features.\n2. Add an onboarding route (/onboarding) for new users.\n3. Consider adding a notifications table to your database.\n4. A settings page (/settings) is essential for any app.\n\nWould you like me to add any of these automatically?`,
      action: null,
    };
  }

  // Default response
  return {
    reply: `I am Shang Tsung, your Game Plan Architect. I can help you:\n\n• Add features (say "add a payment feature")\n• Add pages (say "add a profile page")\n• Add database tables (say "add an orders table")\n• Review your project (say "give me a summary")\n• Suggest improvements (say "what should I improve?")\n\nWhat would you like to build?`,
    action: null,
  };
}

// Helper functions
function extractFeatureName(message: string): string {
  const match = message.match(/add (?:a |an )?(.+?) feature/i);
  return match ? capitalize(match[1]) : "New Feature";
}

function extractRouteName(message: string): string {
  const match = message.match(/add (?:a |an )?(.+?) (?:route|page)/i);
  return match ? capitalize(match[1]) : "New Page";
}

function extractTableName(message: string): string {
  const match = message.match(/add (?:a |an )?(.+?) table/i);
  return match ? match[1].toLowerCase() : "new_table";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Execute the action Shang Tsung decided on
async function executeAction(projectId: string, action: any) {
  if (action.type === "ADD_FEATURE") {
    await prisma.projectFeature.create({
      data: {
        project: { connect: { id: projectId } },
        feature_name: action.data.feature_name,
        priority: action.data.priority,
        complexity: action.data.complexity,
        status: "Planned",
      },
    });
  }

  if (action.type === "ADD_ROUTE") {
    await prisma.projectRoute.create({
      data: {
        project: { connect: { id: projectId } },
        page_name: action.data.page_name,
        route_path: action.data.route_path,
        purpose: action.data.purpose,
        access_level: "registered",
        sort_order: 99,
      },
    });
  }

  if (action.type === "ADD_TABLE") {
    await prisma.projectDatabaseTable.create({
      data: {
        project: { connect: { id: projectId } },
        table_name: action.data.table_name,
        purpose: action.data.purpose,
        fields_json: action.data.fields,
      },
    });
  }
}

// REAL AI (activates when USE_MOCK = false)
async function generateAIResponse(
  message: string,
  project: any
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const systemPrompt = `
You are Shang Tsung, the elite Game Plan Architect inside App Builder Studio by S2KDOTZA Entertainment.
You are a master strategist. You speak with authority, clarity, and precision.
You are currently helping the user build: "${project.app_name}".
App purpose: ${project.app_description}
Current routes: ${project.routes?.map((r: any) => r.page_name).join(", ") || "none"}
Current features: ${project.features?.map((f: any) => f.feature_name).join(", ") || "none"}
Current database tables: ${project.databaseTables?.map((t: any) => t.table_name).join(", ") || "none"}

Your role:
- Answer questions about the app
- Suggest improvements
- Help the user think clearly about their product
- Be direct, confident, and strategic
- Keep responses concise and actionable
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || "I could not generate a response. Please try again.";
}