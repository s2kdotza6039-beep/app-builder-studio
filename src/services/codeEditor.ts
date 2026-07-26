import { prisma } from "@/lib/prisma";
import { callOpenAI } from "./openaiClient";
import { forgeChatResponseSchema, FileChange } from "./aiSchemas";

export interface EditResult {
  reply: string;
  filesChanged: number;
  created: number;
  updated: number;
  deleted: number;
}

/* ------------------------------------------------------------------ */
/*  Path + content helpers                                            */
/* ------------------------------------------------------------------ */

// Normalises AI-returned paths to the DB convention: app/page.tsx (no
// leading slash, no ./, no src/ prefix). This is THE fix for the
// "command shows in chat but edits nothing" bug.
function cleanPath(p: string): string {
  return (p || "")
    .trim()
    .replace(/\\/g, "/") // windows backslashes
    .replace(/^(\.\/|\/)+/, "") // leading ./ or /
    .replace(/^src\//i, "") // src/ prefix
    .replace(/\/+/g, "/") // double slashes
    .replace(/^\/+/, "")
    .trim();
}

function inferLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx": return "tsx";
    case "ts": return "typescript";
    case "jsx": return "jsx";
    case "js": return "javascript";
    case "css": return "css";
    case "json": return "json";
    case "md": return "markdown";
    case "html": return "html";
    case "svg": return "svg";
    default: return "text";
  }
}

// Strips ```tsx ... ``` fences the model sometimes wraps content in.
function stripCodeFences(s: string): string {
  const t = (s || "").trim();
  const fence = t.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  if (fence) return fence[1].trim();
  return t;
}

/* ------------------------------------------------------------------ */
/*  JSON extraction (defensive — survives markdown wrapping)          */
/* ------------------------------------------------------------------ */

function extractJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Accepts the AI's many naming variants for the file list.
function normalizeFiles(raw: any): FileChange[] {
  if (!raw || typeof raw !== "object") return [];
  const arr =
    raw.files ??
    raw.updatedFiles ??
    raw.createdFiles ??
    raw.modifiedFiles ??
    [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((f: any) => ({
      file_path: f?.file_path ?? f?.path ?? f?.filename ?? "",
      content: typeof f?.content === "string" ? stripCodeFences(f.content) : "",
      action: ["create", "update", "delete"].includes(f?.action)
        ? (f.action as "create" | "update" | "delete")
        : ("update" as const),
    }))
    .filter((f: FileChange) => cleanPath(f.file_path).length > 0);
}

/* ------------------------------------------------------------------ */
/*  Traffic-Light preferences (learned from message ratings)         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  System prompt — strict, secure, design-aware                     */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are SHANG TSUNG, the elite AI engine powering "App Builder Studio". You are a Senior Full-Stack Engineer, App Architect, and Security Expert. Your output matches the production quality of platforms like Lovable.

CORE RULES (violation = failure):
1. FILE PATHS: Always use paths relative to the project root with NO leading slash and NO "src/" prefix.
   CORRECT:   app/page.tsx, app/about/page.tsx, components/Navigation.tsx, components/Logo.tsx
   WRONG:     /app/page.tsx, ./app/page.tsx, src/app/page.tsx
2. OUTPUT FORMAT: Respond with ONLY a JSON object, no markdown, no commentary outside the JSON:
   {
     "reply": "A short, friendly message to the user describing what you did.",
     "files": [
       { "file_path": "app/page.tsx", "action": "update", "content": "FULL file content here" }
     ]
   }
   - action is "create" | "update" | "delete".
   - For "delete", content can be empty.
   - Always return the COMPLETE file content, never snippets like "// rest of code".
3. NEVER use placeholders, TODOs, or "insert code here". Every line must be production-ready.
4. SECURITY: Escape user input, avoid eval/dangerous innerHTML, follow OWASP basics.
5. FOLLOW INSTRUCTIONS EXACTLY. If the user asks to change a title, change ONLY that and keep the rest intact.

CREATE vs EDIT — THIS IS THE #1 MISTAKE, NEVER DO IT:
- If the user asks to CREATE, ADD, BUILD, or MAKE a NEW page / component / feature, you MUST use action: "create" with a BRAND-NEW file_path that does NOT already exist in the file tree.
- NEVER fake a "new" thing by editing an existing file. Example: to build an About page, CREATE app/about/page.tsx — do NOT edit app/page.tsx.
- If the user asks to CHANGE or FIX an existing page, use action: "update" with that exact existing path.
- Look at the FILE TREE given to you. Do not recreate files that already exist.

NEW PAGE / ROUTE CONVENTIONS (use these exact paths):
- Home page:    app/page.tsx
- Other page:   app/<name>/page.tsx   (About -> app/about/page.tsx, Contact -> app/contact/page.tsx)
- Reusable UI:  components/<Name>.tsx  (components/Navbar.tsx, components/Logo.tsx)
- When you create 2 or more pages, ALSO create a navigation (components/Navbar.tsx, or a nav bar inside app/layout.tsx) with working links so every page is reachable. Use plain <a href="/about"> links (Next.js <Link> is auto-stubbed to <a> in the live preview).

EXAMPLE — user says "Create an About page with a big heading 'About Us'":
{
  "reply": "Done! I created your About page at app/about/page.tsx. 🧠",
  "files": [
    { "file_path": "app/about/page.tsx", "action": "create", "content": "export default function AboutPage() {\n  return (\n    <main className=\"min-h-screen p-10\">\n      <h1 className=\"text-4xl font-bold\">About Us</h1>\n      <p className=\"mt-4 text-slate-600\">Welcome to our story.</p>\n    </main>\n  );\n}\n" }
  ]
}

DESIGN & LOGO MASTERY (professional, up-class):
- When asked for a logo or graphic, produce a clean, modern SVG component using viewBox, gradients, and geometric paths.
- Use sophisticated, professional palettes only: charcoal #1e293b with warm amber #f59e0b, emerald #10b981 with jade, or deep navy with gold. Never neon/clashing colors.
- Components must be valid React + Tailwind, self-contained, and import nothing that does not exist.
- Respect the existing file tree — edit the right files, create new ones only when needed.

EXPANDED KNOWLEDGE BASE — you are fluent in:
- FRAMEWORKS: Next.js 16 (App Router, Server & Client Components, Route Handlers, Middleware), React 19 (hooks, Suspense, transitions), Vite + React.
- LANGUAGES: TypeScript (strict), JavaScript (ES2024), HTML5, CSS3.
- STYLING: Tailwind CSS v4, CSS Modules, responsive utility classes, design tokens.
- UI COMPONENTS: shadcn/ui patterns, Radix primitives, Lucide icons, custom accessible components.
- STATE: React Context, useReducer, Zustand, TanStack Query for server state, URL state.
- DATA & BACKEND: Next.js Route Handlers, Prisma ORM, PostgreSQL, REST API design, JSON responses.
- AUTH & USERS: Auth.js / NextAuth sessions, protected routes, role-based access, middleware guards.
- FORMS & VALIDATION: controlled + uncontrolled forms, Zod schemas, client + server validation.
- PAYMENTS: Stripe Checkout / webhook patterns, pricing tables, plan gating.
- MEDIA: image optimization (next/image), SVG generation, file uploads.
- DEPLOYMENT: Vercel build, environment variables, edge vs node runtime.

ARCHITECTURE PRINCIPLES (apply by default):
- Mobile-first, fully responsive (sm/md/lg/xl breakpoints).
- Semantic HTML + ARIA for accessibility; sufficient color contrast.
- Server Components for data fetching; Client Components only where interactivity is needed.
- Small, composable components — one responsibility each; co-locate related files.
- One design system: define colors, spacing, radius, typography once and reuse.

APP-TYPE PLAYBOOK (recognize intent and scaffold accordingly):
- SaaS Dashboard: sidebar nav, auth, settings, data tables, charts.
- Landing Page: hero, features, testimonials, pricing, CTA, footer.
- E-commerce: product grid, cart, checkout, order history.
- Blog/CMS: post list, article view, categories, markdown rendering.
- Portfolio/Personal: hero, about, projects, contact form.

You are precise, authoritative, and you ALWAYS deliver working code.`;

/* ------------------------------------------------------------------ */
/*  Core engine                                                       */
/* ------------------------------------------------------------------ */

async function tryGenerate(messages: any[]): Promise<ForgeChatResponse | null> {
  try {
    const text = await callOpenAI(messages, { json: true });
    const json = extractJson(text);
    if (!json) return null;
    const result = forgeChatResponseSchema.safeParse(json);
    if (!result.success) return null;
    return result.data;
  } catch (e) {
    console.error("=== EDITOR GENERATE ERROR ===", e);
    return null;
  }
}

export async function editProjectCode(input: {
  projectId: string;
  userMessage: string;
  history: { role: string; content: string }[];
  pinnedContext?: string;
}): Promise<EditResult> {
  const existing = await prisma.projectFile.findMany({
    where: { project_id: input.projectId },
  });

  const ratedRows = await prisma.aiMessage.findMany({
    where: { project_id: input.projectId },
    orderBy: { created_at: "desc" },
    take: 120,
    select: { role: true, message: true, metadata: true },
  });
  const rated = ratedRows.filter(
    (r) => r.metadata && typeof r.metadata === "object" && (r.metadata as any).rating
  );

  const tree =
    existing.map((f) => f.file_path).sort().join("\n") || "(no files yet)";

  const historyText = (input.history || [])
    .slice(-20)
    .map((m) => `${m.role === "user" ? "USER" : "SHANG TSUNG"}: ${m.content}`)
    .join("\n\n");

  const pinnedText = input.pinnedContext
    ? `\n\n### PINNED USER CONTEXT (always respect this):\n${input.pinnedContext}\n`
    : "";

  const prefsText = rated.length
    ? `\n\n### USER PREFERENCES (learned from your Traffic-Light ratings — adapt to these):\n${buildPrefs(rated)}\n`
    : "";

  const system = SYSTEM_PROMPT + pinnedText + prefsText;
  const user = `PROJECT FILE TREE:\n${tree}\n\nRECENT CONVERSATION:\n${historyText}\n\nUSER INSTRUCTION:\n${input.userMessage}\n\nRespond ONLY in the required JSON format.`;

  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];

  // First attempt
  let parsed = await tryGenerate(messages);

  // Self-healing retry: re-prompt with a correction if parse failed.
  if (!parsed) {
    messages.push({
      role: "assistant" as const,
      content: "I will follow the exact JSON format.",
    });
    messages.push({
      role: "user" as const,
      content:
        'Your previous response was invalid. Return ONLY JSON: {"reply": string, "files": [{file_path, content, action}]}. No markdown. Now apply the user instruction.',
    });
    parsed = await tryGenerate(messages);
  }

  if (!parsed) {
    return {
      reply:
        "I received your instruction but couldn't produce valid changes. Please rephrase it clearly (e.g. 'Change the homepage title to Welcome').",
      filesChanged: 0,
      created: 0,
      updated: 0,
      deleted: 0,
    };
  }

  // Apply file changes to the database.
  let created = 0;
  let updated = 0;
  let deleted = 0;

  const files = normalizeFiles(parsed);
  for (const fc of files) {
    const path = cleanPath(fc.file_path);
    if (!path) continue;

    const match = existing.find(
      (f) => f.file_path.toLowerCase() === path.toLowerCase()
    );

    if (fc.action === "delete") {
      if (match) {
        await prisma.projectFile.delete({ where: { id: match.id } });
        deleted++;
      }
      continue;
    }

    if (match) {
      await prisma.projectFile.update({
        where: { id: match.id },
        data: { content: fc.content, language: inferLang(path), updated_at: new Date() },
      });
      updated++;
    } else {
      await prisma.projectFile.create({
        data: {
          project_id: input.projectId,
          file_path: path,
          content: fc.content,
          language: inferLang(path),
        },
      });
      created++;
    }
  }

  const filesChanged = created + updated + deleted;
  const reply = parsed.reply || "Done — I updated your project files.";

  return { reply, filesChanged, created, updated, deleted };
}
