import OpenAI from "openai";

const USE_MOCK = true; // ← Change to false when OpenAI funds are loaded

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "not-needed-in-mock-mode",
});

export interface AppPlan {
  app_name: string;
  app_purpose: string;
  target_users: string;
  main_features: string[];
  pages: { page_name: string; route_path: string; purpose: string }[];
  database_tables: { table_name: string; purpose: string; fields: string[] }[];
  business_model: string;
}

function generateMockPlan(idea: string, appType: string): AppPlan {
  return {
    app_name: `${appType.split(" ")[0]} Pro`,
    app_purpose: `An app based on: ${idea.substring(0, 80)}...`,
    target_users: "Small businesses and entrepreneurs",
    main_features: [
      "User registration and profiles",
      "Main dashboard with analytics",
      "Core service management",
      "Notifications system",
      "Payment integration",
    ],
    pages: [
      { page_name: "Home", route_path: "/", purpose: "Landing page" },
      { page_name: "Login", route_path: "/auth", purpose: "User authentication" },
      { page_name: "Dashboard", route_path: "/dashboard", purpose: "User control center" },
      { page_name: "Settings", route_path: "/settings", purpose: "Account settings" },
    ],
    database_tables: [
      { table_name: "users", purpose: "Stores user accounts", fields: ["id", "email", "name", "created_at"] },
      { table_name: "items", purpose: "Core business data", fields: ["id", "user_id", "title", "status"] },
    ],
    business_model: "Freemium with Pro subscription",
  };
}

export async function generateAppPlan(
  idea: string,
  appType: string,
  complexity: string
): Promise<AppPlan> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1500));
    return generateMockPlan(idea, appType);
  }

  const prompt = `
You are a senior product manager. Generate an app plan for: "${idea}"
App type: ${appType}. Complexity: ${complexity}.
Respond ONLY in JSON:
{
  "app_name": "...", "app_purpose": "...", "target_users": "...",
  "main_features": ["..."],
  "pages": [{"page_name": "...", "route_path": "...", "purpose": "..."}],
  "database_tables": [{"table_name": "...", "purpose": "...", "fields": ["..."]}],
  "business_model": "..."
}`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}") as AppPlan;
}