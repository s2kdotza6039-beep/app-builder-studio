import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";

const USE_MOCK = false;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, user_id: user.id },
      include: {
        routes: true,
        features: true,
        databaseTables: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (USE_MOCK || !apiKey) {
      return NextResponse.json({
        success: true,
        suggestions: getFallbackSuggestions(project.app_name, project.app_type || "SaaS"),
      });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = [
      "You are Shang Tsung, the elite AI Architect inside App Builder Studio by S2KDOTZA Entertainment.",
      "Your role right now is to generate exactly 4 high-value, professional, business-standard engineering commands that the founder can click to instantly upgrade their specific application inside The Forge.",
      "",
      "CRITICAL RULES FOR SUGGESTIONS:",
      "1. Make them ultra-tailored to the project's exact name, business model, and planned features.",
      "2. Cover 4 distinct categories:",
      "   - Category A (Visual & Logo Design): E.g., creating a glowing custom SVG logo component (`components/Logo.tsx`) or vector hero illustration.",
      "   - Category B (Conversion & UI/UX): E.g., adding an interactive pricing calculator or high-converting call-to-action banner.",
      "   - Category C (Security & Data Handling): E.g., building a defensive admin metrics dashboard or secure authentication modal.",
      "   - Category D (Modern Micro-Interactions): E.g., adding glowing glassmorphic cards with animated hover states and status badges.",
      "3. Return ONLY valid JSON with an array named `suggestions` containing exactly 4 string prompts.",
      "",
      "Required JSON Schema:",
      "{",
      '  "suggestions": [',
      '    "Create a brand new custom vector SVG logo component inside components/Logo.tsx with glowing orange and amber geometric paths, then embed it inside Navigation.tsx",',
      '    "Modify app/page.tsx to add an interactive 3-tier SaaS pricing calculator with animated toggle switches between Monthly and Annual billing",',
      '    "Create an enterprise analytics metrics section on app/dashboard/page.tsx displaying live revenue, user growth, and system uptime graphs",',
      '    "Add glowing glassmorphic customer testimonial cards on app/reviews/page.tsx with verified buyer badges and 5-star rating indicators"',
      "  ]",
      "}",
    ].join("\n");

    const userMessage = [
      `Analyze our project and generate 4 elite, project-tailored Quick Commands:`,
      `App Name: "${project.app_name}"`,
      `App Type: "${project.app_type || "Custom Application"}"`,
      `Description: "${project.app_description || ""}"`,
      `Routes: ${project.routes.map((r) => r.route_path).join(", ")}`,
      `Features: ${project.features.map((f) => f.feature_name).join(", ")}`,
      "",
      "Return ONLY valid JSON with exactly 4 professional commands.",
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // Higher temperature for creative variety when shuffled!
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return NextResponse.json({
        success: true,
        suggestions: parsed.suggestions.slice(0, 4),
      });
    }

    return NextResponse.json({
      success: true,
      suggestions: getFallbackSuggestions(project.app_name, project.app_type || "SaaS"),
    });
  } catch (error) {
    console.error("GET /api/projects/[id]/suggestions error:", error);
    return NextResponse.json(
      {
        success: true,
        suggestions: getFallbackSuggestions("Your Application", "Custom App"),
      },
      { status: 200 }
    );
  }
}

function getFallbackSuggestions(appName: string, appType: string): string[] {
  return [
    `Create a custom vector SVG logo component inside components/Logo.tsx with glowing geometric paths specifically branded for ${appName}, then display it in Navigation.tsx`,
    `Modify app/page.tsx to add a high-converting 3-tier pricing table for ${appName} featuring Free, Pro, and Enterprise tiers with glowing border hover animations`,
    `Create a modern analytics metrics dashboard inside app/dashboard/page.tsx with live statistical cards and responsive data charts for ${appType} managers`,
    `Add interactive verified customer review cards on app/reviews/page.tsx with 5-star rating badges and glassmorphic styling`,
  ];
}