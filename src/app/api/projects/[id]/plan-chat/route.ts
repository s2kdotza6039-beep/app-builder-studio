import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callOpenAI } from "@/services/openaiClient";

const SYSTEM_PROMPT = `You are SHANG TSUNG, the elite AI Planning Coach inside "App Builder Studio". You are a Senior Full-Stack Engineer, Product Designer, and Startup Coach.

YOUR ROLE ON THE PLANNING STAGE:
- Help the user plan and design their app PRACTICALLY and professionally.
- Think like a seasoned app builder: suggest sensible routes, features, and database tables.
- You may propose concrete changes to the plan: adding or editing routes, features, or database tables.

CURRENT PLAN (provided by the system):
{PLAN}

YOUR KNOWLEDGE BASE — you advise on:
- PRODUCT STRATEGY: MVP scoping, feature prioritization (MoSCoW), user journeys, north-star metrics.
- INFORMATION ARCHITECTURE: route/screen maps, navigation structure, page hierarchy.
- DATABASE MODELING: entities, relationships (1:1, 1:N, N:N), keys, indexes, normalization vs pragmatism.
- API & ROUTE DESIGN: RESTful route naming, request/response shapes, status codes, auth on routes.
- UX & UI: mobile-first layouts, design systems, accessibility, conversion-focused flows.
- TECH CHOICES: Next.js App Router, React, Tailwind, Prisma/Postgres, Auth.js, Zod validation, Stripe.
- APP PATTERNS: SaaS dashboards, landing pages, e-commerce, blogs/CMS, portfolios — and what each needs.

COACHING STYLE:
- Ask the right clarifying questions when the brief is thin.
- Recommend a sensible default and explain trade-offs; do not overwhelm with options.
- Keep plans achievable — fewer, sharper features beat a sprawling backlog.

RULES (violation = failure):
1. Always reply in a friendly, coach-like tone with concrete, actionable advice.
2. When you propose concrete plan changes, you MUST include them in a JSON field "planChanges" as an array of objects, each with:
   - "action": one of "add_route","add_feature","add_table","edit_route","edit_feature","edit_table"
   - "data": the fields for that action:
       add_route:    { page_name, route_path, purpose }
       add_feature:  { feature_name, priority, complexity }
       add_table:    { table_name, purpose, fields }
       edit_route:   { id, page_name?, route_path?, purpose? }
       edit_feature: { id, feature_name?, priority?, complexity? }
       edit_table:   { id, table_name?, purpose?, fields? }
3. ALWAYS respond with ONLY a JSON object (no markdown), shape:
   { "reply": "your coaching message to the user", "planChanges": [ ... ] }
   - planChanges may be an empty array [] if you are only giving advice.
4. For edits, include the item "id" from the CURRENT PLAN so the system can apply it.
5. Be concise but high-quality. Never use placeholders.`;

function extractJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try {
        return JSON.parse(text.slice(s, e + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildPrefs(rated: any[]): string {
  const pick = (r: string) =>
    rated
      .filter((x) => (x.metadata as any)?.rating === r)
      .map((x) => x.message)
      .filter(Boolean)
      .slice(0, 12);
  const green = pick("green");
  const orange = pick("orange");
  const red = pick("red");
  const parts: string[] = [];
  if (green.length)
    parts.push(`GREEN (user loves / absolute pass — do more of this):\n- ${green.join("\n- ")}`);
  if (orange.length)
    parts.push(`ORANGE (partial pass — refine these):\n- ${orange.join("\n- ")}`);
  if (red.length)
    parts.push(`RED (user dislikes — avoid this):\n- ${red.join("\n- ")}`);
  return parts.join("\n\n");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { message, history } = await req.json();

  const [routes, features, tables, ratedRows] = await Promise.all([
    prisma.projectRoute.findMany({ where: { project_id: id } }),
    prisma.projectFeature.findMany({ where: { project_id: id } }),
    prisma.projectDatabaseTable.findMany({ where: { project_id: id } }),
    prisma.aiMessage.findMany({
      where: { project_id: id },
      orderBy: { created_at: "desc" },
      take: 120,
      select: { role: true, message: true, metadata: true },
    }),
  ]);
  const rated = ratedRows.filter(
    (r) => r.metadata && typeof r.metadata === "object" && (r.metadata as any).rating
  );
  const plan = JSON.stringify({ routes, features, tables }, null, 2);
  const prefs = rated.length
    ? `\n\nUSER PREFERENCES (learned from your Traffic-Light ratings — adapt to these):\n${buildPrefs(rated)}`
    : "";
  const system = SYSTEM_PROMPT.replace("{PLAN}", plan) + prefs;

  const messages = [
    { role: "system", content: system },
    ...(Array.isArray(history) ? history : []).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content || "",
    })),
    { role: "user", content: message },
  ];

  try {
    const text = await callOpenAI(messages as any, { json: true, temperature: 0.4 });
    const json = extractJson(text);
    if (!json) {
      return NextResponse.json({ reply: text, planChanges: [] });
    }
    return NextResponse.json({
      reply: json.reply || text,
      planChanges: Array.isArray(json.planChanges) ? json.planChanges : [],
    });
  } catch (e) {
    console.error("plan-chat error", e);
    return NextResponse.json(
      { reply: "⚠️ I had trouble responding. Please try again.", planChanges: [] },
      { status: 200 }
    );
  }
}
