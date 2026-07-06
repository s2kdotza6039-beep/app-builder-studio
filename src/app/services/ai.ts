import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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

export async function generateAppPlan(idea: string, appType: string, complexity: string): Promise<AppPlan> {
  const prompt = `
You are a senior product manager and app strategist. 

Generate a clean, professional app plan based on this idea:

"${idea}"

App type: ${appType}
Complexity level: ${complexity}

You must respond ONLY in this exact JSON format, no extra text, no markdown, no explanation:

{
  "app_name": "Short professional app name",
  "app_purpose": "One sentence describing what the app does",
  "target_users": "Who this app is for",
  "main_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "pages": [
    {"page_name": "Home", "route_path": "/", "purpose": "Landing page"},
    {"page_name": "Dashboard", "route_path": "/dashboard", "purpose": "User control center"}
  ],
  "database_tables": [
    {"table_name": "users", "purpose": "Stores user accounts", "fields": ["id", "email", "created_at"]}
  ],
  "business_model": "How this app makes money (Free, Subscription, etc.)"
}

Keep the plan focused on the ${complexity} level. Do not overcomplicate.
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a senior product manager. You ALWAYS respond with valid JSON only. No markdown. No explanation." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const text = response.choices[0]?.message?.content || "{}";
  return JSON.parse(text) as AppPlan;
}