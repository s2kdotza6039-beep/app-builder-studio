import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USE_MOCK = false;

type ProjectContext = {
  app_name: string | null;
  app_description: string | null;
  target_users: string | null;
  business_model: string | null;
  routes: Array<{
    id: string;
    page_name: string;
    route_path: string;
    purpose: string | null;
  }>;
  features: Array<{
    id: string;
    feature_name: string;
    priority: string | null;
    complexity: string | null;
  }>;
  databaseTables: Array<{
    id: string;
    table_name: string;
    purpose: string | null;
  }>;
};

type AssistantAction =
  | {
      type: "ADD_FEATURE";
      data: {
        feature_name: string;
        priority: string;
        complexity: string;
      };
    }
  | {
      type: "ADD_ROUTE";
      data: {
        page_name: string;
        route_path: string;
        purpose: string;
      };
    }
  | {
      type: "ADD_TABLE";
      data: {
        table_name: string;
        purpose: string;
        fields: Array<{ name: string; type: string }>;
      };
    }
  | {
      type: "DELETE_FEATURE";
      data: {
        id: string;
        name: string;
      };
    }
  | {
      type: "DELETE_ROUTE";
      data: {
        id: string;
        name: string;
      };
    }
  | {
      type: "DELETE_TABLE";
      data: {
        id: string;
        name: string;
      };
    }
  | {
      type: "APPLY_RECOMMENDATIONS";
      data: Record<string, never>;
    };

type AssistantResult = {
  reply: string;
  action: AssistantAction | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: projectId } = await context.params;
    const body = await request.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Security: the project must belong to the signed-in user.
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user_id: user.id,
      },
      include: {
        routes: {
          orderBy: {
            sort_order: "asc",
          },
        },
        features: true,
        databaseTables: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 }
      );
    }

    // Read the previous assistant message before saving the new user message.
    // This allows commands such as "yes please" to understand context.
    const latestAssistantMessage = await prisma.aiMessage.findFirst({
      where: {
        project_id: projectId,
        role: "assistant",
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        message: true,
      },
    });

    await prisma.aiMessage.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
        role: "user",
        message,
      },
    });

    let result: AssistantResult;

    if (USE_MOCK) {
      result = createMockResponse(
        message,
        project,
        latestAssistantMessage?.message ?? null
      );
    } else {
      result = {
        reply: await createRealAIResponse(message, project),
        action: null,
      };
    }

    if (result.action) {
      await executeAction(projectId, result.action, project);
    }

    await prisma.aiMessage.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
        role: "assistant",
        message: result.reply,
        metadata: result.action
          ? {
              action: result.action.type,
            }
          : undefined,
      },
    });

    return NextResponse.json({
      reply: result.reply,
      action: result.action,
    });
  } catch (error) {
    console.error("Shang Tsung chat error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: projectId } = await context.params;

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user_id: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 }
      );
    }

    const messages = await prisma.aiMessage.findMany({
      where: {
        project_id: projectId,
      },
      orderBy: {
        created_at: "asc",
      },
      select: {
        role: true,
        message: true,
        created_at: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat history error:", error);

    return NextResponse.json(
      { error: "Unable to load chat history." },
      { status: 500 }
    );
  }
}

function createMockResponse(
  message: string,
  project: ProjectContext,
  latestAssistantMessage: string | null
): AssistantResult {
  const lowerMessage = message.toLowerCase().trim();

  // Understand follow-up confirmation such as "yes please".
  if (isAffirmativeMessage(lowerMessage)) {
    const previousMessage = latestAssistantMessage?.toLowerCase() ?? "";

    if (
      previousMessage.includes("recommendation") ||
      previousMessage.includes("would you like me to add") ||
      previousMessage.includes("reply \"yes please\"")
    ) {
      return {
        reply:
          "The missing recommendations have been added to your project architecture. Review the right-hand panel and adjust anything you want.",
        action: {
          type: "APPLY_RECOMMENDATIONS",
          data: {},
        },
      };
    }

    return {
      reply:
        "Please tell me exactly which recommendation you want applied. For example: “Add the onboarding page.”",
      action: null,
    };
  }

  // Delete or remove an existing item.
  if (
    lowerMessage.startsWith("delete ") ||
    lowerMessage.startsWith("remove ")
  ) {
    return createDeleteResponse(message, project);
  }

  // Add or create a feature.
  if (
    containsCreationWord(lowerMessage) &&
    lowerMessage.includes("feature")
  ) {
    const featureName = extractFeatureName(message);

    const existingFeature = findNamedItem(
      project.features,
      featureName,
      (feature) => feature.feature_name
    );

    if (existingFeature) {
      return {
        reply: `"${existingFeature.feature_name}" already exists in the feature list.`,
        action: null,
      };
    }

    return {
      reply: `I have added "${featureName}" to the feature list.`,
      action: {
        type: "ADD_FEATURE",
        data: {
          feature_name: featureName,
          priority: "Should Have",
          complexity: "Medium",
        },
      },
    };
  }

  // Add or create a route/page.
  if (
    containsCreationWord(lowerMessage) &&
    (lowerMessage.includes("page") ||
      lowerMessage.includes("route"))
  ) {
    const pageName = extractRouteName(message);

    const existingRoute = findNamedItem(
      project.routes,
      pageName,
      (route) => route.page_name
    );

    if (existingRoute) {
      return {
        reply: `"${existingRoute.page_name}" already exists in the routes list.`,
        action: null,
      };
    }

    return {
      reply: `I have added the "${pageName}" page to your routes.`,
      action: {
        type: "ADD_ROUTE",
        data: {
          page_name: pageName,
          route_path: createRoutePath(pageName),
          purpose: `${pageName} page`,
        },
      },
    };
  }

  // Add or create a database table.
  if (
    containsCreationWord(lowerMessage) &&
    (lowerMessage.includes("table") ||
      lowerMessage.includes("database"))
  ) {
    const tableName = extractTableName(message);

    const existingTable = findNamedItem(
      project.databaseTables,
      tableName,
      (table) => table.table_name
    );

    if (existingTable) {
      return {
        reply: `"${existingTable.table_name}" already exists in the database structure.`,
        action: null,
      };
    }

    return {
      reply: `I have added the "${tableName}" table to your database structure.`,
      action: {
        type: "ADD_TABLE",
        data: {
          table_name: tableName,
          purpose: `Stores ${tableName} data`,
          fields: [
            {
              name: "id",
              type: "String",
            },
            {
              name: "created_at",
              type: "DateTime",
            },
          ],
        },
      },
    };
  }

  // Generate a project summary.
  if (
    lowerMessage.includes("summary") ||
    lowerMessage.includes("overview")
  ) {
    return {
      reply: [
        `Here is the current summary of "${project.app_name ?? "Untitled App"}":`,
        "",
        `Purpose: ${project.app_description ?? "Not specified"}`,
        `Target users: ${project.target_users ?? "Not specified"}`,
        `Pages: ${project.routes.length}`,
        `Features: ${project.features.length}`,
        `Database tables: ${project.databaseTables.length}`,
        `Business model: ${project.business_model ?? "Not specified"}`,
        "",
        "You can ask me to add or remove a page, feature, or table.",
      ].join("\n"),
      action: null,
    };
  }

  // Suggest baseline improvements.
  if (
    lowerMessage.includes("suggest") ||
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("improve")
  ) {
    const missingRecommendations =
      getMissingRecommendations(project);

    if (missingRecommendations.length === 0) {
      return {
        reply:
          "Your project already contains the core baseline recommendations: authentication, onboarding, settings, and notifications.",
        action: null,
      };
    }

    return {
      reply: [
        `I recommend the following improvements for "${project.app_name ?? "your app"}":`,
        "",
        ...missingRecommendations.map(
          (recommendation, index) =>
            `${index + 1}. ${recommendation}`
        ),
        "",
        'Reply "yes please" and I will add every missing recommendation.',
      ].join("\n"),
      action: null,
    };
  }

  return {
    reply: [
      "I am your Game Plan Architect.",
      "",
      "Available commands:",
      "• Add a payment feature",
      "• Add a profile page",
      "• Add an orders table",
      '• Delete "the Base" from routes',
      '• Delete "Payment" from features',
      '• Delete "orders" from database tables',
      "• Give me a summary",
      "• Suggest improvements",
      "",
      "What would you like to change?",
    ].join("\n"),
    action: null,
  };
}

function createDeleteResponse(
  message: string,
  project: ProjectContext
): AssistantResult {
  const lowerMessage = message.toLowerCase();
  const targetName = extractDeleteTarget(message);

  if (!targetName) {
    return {
      reply:
        'Tell me what to remove. Example: Delete "the Base" from routes.',
      action: null,
    };
  }

  if (
    lowerMessage.includes("feature")
  ) {
    const feature = findNamedItem(
      project.features,
      targetName,
      (item) => item.feature_name
    );

    if (!feature) {
      return {
        reply: `I could not find a feature named "${targetName}".`,
        action: null,
      };
    }

    return {
      reply: `I have removed "${feature.feature_name}" from the feature list.`,
      action: {
        type: "DELETE_FEATURE",
        data: {
          id: feature.id,
          name: feature.feature_name,
        },
      },
    };
  }

  if (
    lowerMessage.includes("table") ||
    lowerMessage.includes("database")
  ) {
    const table = findNamedItem(
      project.databaseTables,
      targetName,
      (item) => item.table_name
    );

    if (!table) {
      return {
        reply: `I could not find a database table named "${targetName}".`,
        action: null,
      };
    }

    return {
      reply: `I have removed "${table.table_name}" from the database structure.`,
      action: {
        type: "DELETE_TABLE",
        data: {
          id: table.id,
          name: table.table_name,
        },
      },
    };
  }

  // Treat route, page, file and proposed pages as route commands.
  if (
    lowerMessage.includes("route") ||
    lowerMessage.includes("page") ||
    lowerMessage.includes("file")
  ) {
    const route = findNamedItem(
      project.routes,
      targetName,
      (item) => item.page_name
    );

    if (!route) {
      return {
        reply: `I could not find a page or route named "${targetName}".`,
        action: null,
      };
    }

    return {
      reply: `I have removed "${route.page_name}" from the routes list.`,
      action: {
        type: "DELETE_ROUTE",
        data: {
          id: route.id,
          name: route.page_name,
        },
      },
    };
  }

  // If the user did not name a category, search all categories.
  const route = findNamedItem(
    project.routes,
    targetName,
    (item) => item.page_name
  );

  if (route) {
    return {
      reply: `I have removed "${route.page_name}" from the routes list.`,
      action: {
        type: "DELETE_ROUTE",
        data: {
          id: route.id,
          name: route.page_name,
        },
      },
    };
  }

  const feature = findNamedItem(
    project.features,
    targetName,
    (item) => item.feature_name
  );

  if (feature) {
    return {
      reply: `I have removed "${feature.feature_name}" from the feature list.`,
      action: {
        type: "DELETE_FEATURE",
        data: {
          id: feature.id,
          name: feature.feature_name,
        },
      },
    };
  }

  const table = findNamedItem(
    project.databaseTables,
    targetName,
    (item) => item.table_name
  );

  if (table) {
    return {
      reply: `I have removed "${table.table_name}" from the database structure.`,
      action: {
        type: "DELETE_TABLE",
        data: {
          id: table.id,
          name: table.table_name,
        },
      },
    };
  }

  return {
    reply: `I could not find "${targetName}" in this project.`,
    action: null,
  };
}

async function executeAction(
  projectId: string,
  action: AssistantAction,
  project: ProjectContext
) {
  switch (action.type) {
    case "ADD_FEATURE": {
      await prisma.projectFeature.create({
        data: {
          project: {
            connect: {
              id: projectId,
            },
          },
          feature_name: action.data.feature_name,
          priority: action.data.priority,
          complexity: action.data.complexity,
          status: "Planned",
        },
      });

      return;
    }

    case "ADD_ROUTE": {
      await prisma.projectRoute.create({
        data: {
          project: {
            connect: {
              id: projectId,
            },
          },
          page_name: action.data.page_name,
          route_path: action.data.route_path,
          purpose: action.data.purpose,
          access_level: "registered",
          sort_order: project.routes.length,
        },
      });

      return;
    }

    case "ADD_TABLE": {
      await prisma.projectDatabaseTable.create({
        data: {
          project: {
            connect: {
              id: projectId,
            },
          },
          table_name: action.data.table_name,
          purpose: action.data.purpose,
          fields_json: action.data.fields,
        },
      });

      return;
    }

    case "DELETE_FEATURE": {
      await prisma.projectFeature.deleteMany({
        where: {
          id: action.data.id,
          project_id: projectId,
        },
      });

      return;
    }

    case "DELETE_ROUTE": {
      await prisma.projectRoute.deleteMany({
        where: {
          id: action.data.id,
          project_id: projectId,
        },
      });

      return;
    }

    case "DELETE_TABLE": {
      await prisma.projectDatabaseTable.deleteMany({
        where: {
          id: action.data.id,
          project_id: projectId,
        },
      });

      return;
    }

    case "APPLY_RECOMMENDATIONS": {
      await applyMissingRecommendations(projectId, project);
      return;
    }
  }
}

async function applyMissingRecommendations(
  projectId: string,
  project: ProjectContext
) {
  const hasAuthentication = project.features.some((feature) =>
    normaliseName(feature.feature_name).includes("authentication")
  );

  if (!hasAuthentication) {
    await prisma.projectFeature.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        feature_name: "User authentication",
        priority: "Must Have",
        complexity: "Medium",
        status: "Planned",
      },
    });
  }

  const hasOnboarding = project.routes.some(
    (route) => normaliseName(route.page_name) === "onboarding"
  );

  if (!hasOnboarding) {
    await prisma.projectRoute.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        page_name: "Onboarding",
        route_path: "/onboarding",
        purpose: "Guide new users through their first setup",
        access_level: "registered",
        sort_order: 90,
      },
    });
  }

  const hasSettings = project.routes.some(
    (route) => normaliseName(route.page_name) === "settings"
  );

  if (!hasSettings) {
    await prisma.projectRoute.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        page_name: "Settings",
        route_path: "/settings",
        purpose: "Manage account and application preferences",
        access_level: "registered",
        sort_order: 91,
      },
    });
  }

  const hasNotifications = project.databaseTables.some(
    (table) =>
      normaliseName(table.table_name) === "notifications"
  );

  if (!hasNotifications) {
    await prisma.projectDatabaseTable.create({
      data: {
        project: {
          connect: {
            id: projectId,
          },
        },
        table_name: "notifications",
        purpose: "Stores user notifications and read status",
        fields_json: [
          {
            name: "id",
            type: "String",
          },
          {
            name: "user_id",
            type: "String",
          },
          {
            name: "message",
            type: "String",
          },
          {
            name: "is_read",
            type: "Boolean",
          },
          {
            name: "created_at",
            type: "DateTime",
          },
        ],
      },
    });
  }
}

function getMissingRecommendations(
  project: ProjectContext
): string[] {
  const recommendations: string[] = [];

  const hasAuthentication = project.features.some((feature) =>
    normaliseName(feature.feature_name).includes("authentication")
  );

  if (!hasAuthentication) {
    recommendations.push(
      "Add user authentication as a Must Have feature."
    );
  }

  const hasOnboarding = project.routes.some(
    (route) => normaliseName(route.page_name) === "onboarding"
  );

  if (!hasOnboarding) {
    recommendations.push(
      "Add an onboarding page for first-time users."
    );
  }

  const hasSettings = project.routes.some(
    (route) => normaliseName(route.page_name) === "settings"
  );

  if (!hasSettings) {
    recommendations.push(
      "Add a settings page for account preferences."
    );
  }

  const hasNotifications = project.databaseTables.some(
    (table) =>
      normaliseName(table.table_name) === "notifications"
  );

  if (!hasNotifications) {
    recommendations.push(
      "Add a notifications table to support user alerts."
    );
  }

  return recommendations;
}

function isAffirmativeMessage(message: string) {
  return /^(yes|yes please|please do|do it|apply them|add them|go ahead|okay|ok|sure)\b/i.test(
    message
  );
}

function containsCreationWord(message: string) {
  return /\b(add|create|make|build)\b/i.test(message);
}

function extractFeatureName(message: string) {
  const match = message.match(
    /(?:add|create|make|build)\s+(?:a\s+|an\s+|the\s+)?(.+?)\s+feature\b/i
  );

  return match ? capitalise(match[1].trim()) : "New Feature";
}

function extractRouteName(message: string) {
  const match = message.match(
    /(?:add|create|make|build)\s+(?:a\s+|an\s+|the\s+)?(.+?)\s+(?:route|page)\b/i
  );

  return match ? capitalise(match[1].trim()) : "New Page";
}

function extractTableName(message: string) {
  const match = message.match(
    /(?:add|create|make|build)\s+(?:a\s+|an\s+|the\s+)?(.+?)\s+(?:database\s+table|table)\b/i
  );

  return match
    ? match[1].trim().toLowerCase().replace(/\s+/g, "_")
    : "new_table";
}

function extractDeleteTarget(message: string) {
  const quotedMatch = message.match(
    /["“”']([^"“”']+)["“”']/
  );

  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  const categoryMatch = message.match(
    /(?:delete|remove)\s+(.+?)\s+(?:from|on|in)\s+(?:the\s+)?(?:proposed\s+pages|routes?|pages?|features?|database|tables?)/i
  );

  if (categoryMatch) {
    return cleanDeleteTarget(categoryMatch[1]);
  }

  const itemMatch = message.match(
    /(?:delete|remove)\s+(.+?)\s+(?:route|page|feature|table|file)\b/i
  );

  if (itemMatch) {
    return cleanDeleteTarget(itemMatch[1]);
  }

  const fallbackMatch = message.match(
    /(?:delete|remove)\s+(.+)$/i
  );

  return fallbackMatch
    ? cleanDeleteTarget(fallbackMatch[1])
    : "";
}

function cleanDeleteTarget(value: string) {
  return value
    .trim()
    .replace(/\s+(?:file|route|page|feature|table)$/i, "")
    .trim();
}

function createRoutePath(pageName: string) {
  const path = pageName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return `/${path || "new-page"}`;
}

function findNamedItem<T>(
  items: T[],
  targetName: string,
  getName: (item: T) => string
): T | undefined {
  const target = normaliseName(targetName);

  const exactMatch = items.find(
    (item) => normaliseName(getName(item)) === target
  );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = items.filter((item) => {
    const itemName = normaliseName(getName(item));

    return (
      itemName.includes(target) ||
      target.includes(itemName)
    );
  });

  return partialMatches.length === 1
    ? partialMatches[0]
    : undefined;
}

function normaliseName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/["“”']/g, "")
    .replace(/\s+/g, " ");
}

function capitalise(value: string) {
  return value
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

async function createRealAIResponse(
  message: string,
  project: ProjectContext
) {
  const { default: OpenAI } = await import("openai");

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `
You are the Game Plan Architect inside App Builder Studio.

Current project: ${project.app_name ?? "Untitled App"}
Purpose: ${project.app_description ?? "Not specified"}
Routes: ${project.routes.map((route) => route.page_name).join(", ")}
Features: ${project.features.map((feature) => feature.feature_name).join(", ")}
Database tables: ${project.databaseTables.map((table) => table.table_name).join(", ")}

Give concise, practical, build-focused advice.
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  return (
    response.choices[0]?.message?.content ??
    "I could not generate a response."
  );
}