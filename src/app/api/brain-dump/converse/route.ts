import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const USE_MOCK = false;

const SHANG_QUESTIONS = [
  "What problem does this app solve — and who specifically has that problem?",
  "How does the user make or save money with this? What is the business model?",
  "What are the 3 most important things a user can do in this app?",
  "Who are your competitors? What makes your version better or different?",
  "Is this free, paid, or subscription-based? Who pays and how much?",
];

const SHANG_ACKNOWLEDGEMENTS = [
  "Good. That gives me clarity.",
  "Understood. That helps me see the direction.",
  "I see what you are building.",
  "That is a strong foundation to work from.",
  "Good instinct. Keep going.",
  "Noted. This is coming together.",
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const history = Array.isArray(body.history) ? body.history : [];
    const userMessage =
      typeof body.userMessage === "string" ? body.userMessage.trim() : "";

    if (!userMessage) {
      return NextResponse.json(
        { error: "No message provided." },
        { status: 400 }
      );
    }

    if (USE_MOCK) {
      const result = mockConverse(history, userMessage);
      return NextResponse.json(result);
    }

    const result = await realConverse(history, userMessage);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Brain dump converse error:", error);

    return NextResponse.json(
      {
        reply:
          "I had a momentary issue. Please send your message again — I am ready.",
        ready: false,
        project: null,
      },
      { status: 200 }
    );
  }
}

function mockConverse(
  history: Array<{ role: string; content: string }>,
  userMessage: string
) {
  const userTurns = history.filter((h) => h.role === "user").length;

  // After 5 user messages, declare ready
  if (userTurns >= 5) {
    return {
      reply:
        "I now have everything I need to structure your project.\n\nClick the green button above to create your project from this conversation.\n\nWe have covered the idea, the users, the business model, and the core features. This is ready to build.",
      ready: true,
      project: null,
    };
  }

  // After 4 messages, give a heads-up
  if (userTurns === 4) {
    const ack =
      SHANG_ACKNOWLEDGEMENTS[userTurns % SHANG_ACKNOWLEDGEMENTS.length];
    return {
      reply: `${ack}\n\n${SHANG_QUESTIONS[userTurns]}\n\nThis is the last question. After your answer I will be ready to structure the project.`,
      ready: false,
      project: null,
    };
  }

  const nextQuestion = SHANG_QUESTIONS[userTurns] || "Tell me anything else that matters about this project.";
  const ack = SHANG_ACKNOWLEDGEMENTS[userTurns % SHANG_ACKNOWLEDGEMENTS.length];

  return {
    reply: `${ack}\n\n${nextQuestion}`,
    ready: false,
    project: null,
  };
}

async function realConverse(
  history: Array<{ role: string; content: string }>,
  userMessage: string
) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are Shang Tsung inside App Builder Studio by S2KDOTZA Entertainment.
You are helping the user plan their app through a natural conversation.
Be concise, direct, and professional. Ask one smart question at a time.
After 4-5 user exchanges, when you have enough information to structure the project, set ready to true.
Always respond with valid JSON only: { "reply": "your message here", "ready": false }`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || "";

  try {
    const result = JSON.parse(content);
    return {
      reply: result.reply || "Tell me more.",
      ready: result.ready === true,
      project: null,
    };
  } catch {
    return {
      reply: "Tell me more about your idea.",
      ready: false,
      project: null,
    };
  }
}