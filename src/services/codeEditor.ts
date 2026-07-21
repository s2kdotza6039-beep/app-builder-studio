import { OpenAI } from "openai";

const USE_MOCK = false;

export interface EditInputFile {
  id: string;
  file_path: string;
  content: string;
  language: string;
}

export interface EditInput {
  instruction: string;
  files: EditInputFile[];
}

export interface UpdatedFile {
  id: string;
  file_path: string;
  content: string;
}

export interface NewFile {
  file_path: string;
  content: string;
  language: string;
}

export interface EditResult {
  reply: string;
  updatedFiles: UpdatedFile[];
  newFiles: NewFile[];
}

export async function editProjectCode(input: EditInput): Promise<EditResult> {
  if (USE_MOCK) {
    return mockEditCode(input);
  }
  return realAIEditCode(input);
}

function mockEditCode(input: EditInput): EditResult {
  const raw = input.instruction.toLowerCase().trim();
  const updated: UpdatedFile[] = [];
  const newFiles: NewFile[] = [];

  const file = (path: string) =>
    input.files.find((f) => f.file_path.toLowerCase() === path.toLowerCase());
  const home = file("app/page.tsx");

  function pushUpdate(f: EditInputFile | undefined, newContent: string): boolean {
    if (!f) return false;
    updated.push({ id: f.id, file_path: f.file_path, content: newContent });
    return true;
  }

  if (raw.includes("logo") || raw.includes("graphic") || raw.includes("svg")) {
    newFiles.push({
      file_path: "components/Logo.tsx",
      language: "typescript",
      content: [
        `export default function Logo({ className = "w-8 h-8" }: { className?: string }) {`,
        `  return (`,
        `    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>`,
        `      <defs>`,
        `        <linearGradient id="lovableGlow" x1="0%" y1="0%" x2="100%" y2="100%">`,
        `          <stop offset="0%" stopColor="#f97316" />`,
        `          <stop offset="50%" stopColor="#ec4899" />`,
        `          <stop offset="100%" stopColor="#6366f1" />`,
        `        </linearGradient>`,
        `      </defs>`,
        `      <circle cx="50" cy="50" r="46" fill="url(#lovableGlow)" fill-opacity="0.15" stroke="url(#lovableGlow)" stroke-width="4" />`,
        `      <path d="M32 68L48 28L68 68L50 54L32 68Z" fill="url(#lovableGlow)" />`,
        `      <circle cx="50" cy="38" r="6" fill="#ffffff" />`,
        `    </svg>`,
        `  );`,
        `}`,
      ].join("\n"),
    });
    return {
      reply: [
        "Created high-end vector SVG brand logo (`components/Logo.tsx`) with dynamic gradient geometry and glow paths! ✅",
        "",
        "💡 PROACTIVE ARCHITECT SUGGESTION: Next, let's import `<Logo className=\"w-9 h-9\" />` into `components/Navigation.tsx` so your brand identity anchors every page of your application!",
      ].join("\n"),
      updatedFiles: [],
      newFiles,
    };
  }

  return {
    reply: [
      "I am Shang Tsung, your AI Dojo Master.",
      "Tell me what visual upgrades, logos, pages, or security features to apply!",
      "",
      "💡 PROACTIVE ARCHITECT SUGGESTION: Ask me to create a custom vector brand logo (`components/Logo.tsx`) or an interactive SaaS pricing calculator!",
    ].join("\n"),
    updatedFiles: [],
    newFiles: [],
  };
}

async function realAIEditCode(input: EditInput): Promise<EditResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      reply: "OpenAI API Key (`OPENAI_API_KEY`) is missing in `.env`. Please add your key to unlock real AI editing.",
      updatedFiles: [],
      newFiles: [],
    };
  }

  const openai = new OpenAI({ apiKey });

  const fileList = input.files
    .map((f) => `=== FILE: ${f.file_path} ===\n${f.content}`)
    .join("\n\n");

  const systemPrompt = [
    "You are Shang Tsung, the elite AI Architect, Security Expert, and Design Mastermind inside App Builder Studio by S2KDOTZA Entertainment.",
    "Your output must match the breathtaking, production-ready aesthetic of elite AI builders like Lovable, v0, and Bolt.",
    "",
    "INTERNAL MULTI-AGENT ORCHESTRATION & SUPERPOWERS PROTOCOL:",
    "Before emitting code, your internal engine MUST execute five virtual verification passes:",
    "1. ARCHITECT PASS: Ensure strict component modularity, clear separation of concerns, and correct Next.js App Router syntax (`app/[route]/page.tsx`). ALWAYS use standard function declarations (`export default function ComponentName() { return (...) }`) — NEVER use arrow functions (`const Comp = () =>`) for top-level exported components or pages to guarantee clean AST compilation.",
    "2. LOVABLE DESIGN SYSTEM PASS: Apply modern UI/UX design excellence to every page and component:",
    "   - Color Spectrum & Depth: Use rich, multi-tone dark palettes (bg-[#09090b], bg-zinc-950, bg-slate-950). Add ambient background glows (bg-gradient-to-tr from-orange-500/15 via-purple-500/10 to-transparent blur-[120px]).",
    "   - Glassmorphism & Cards: Style containers with modern glass aesthetics (border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-2xl).",
    "   - Typography Scale: Use high-contrast headings (font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-400) and clean, readable zinc/slate body text.",
    "   - Micro-Interactions: Buttons and cards must have smooth hover states (transition-all duration-300 hover:-translate-y-1 hover:shadow-orange-500/20 hover:border-white/20).",
    "3. GRAPHICS & LOGO VECTOR SUPERPOWER (HIGH-END DESIGN):",
    "   - You possess the ultimate capability to create vector graphics, brand logos, hero illustrations, and UI iconography directly inside React using clean inline SVG vector geometry (`<svg viewBox=\"...\">`).",
    "   - When the user asks for a logo, graphic, or visual illustration (so they can create logos for their customers!), you MUST create dedicated React vector components (`components/Logo.tsx`, `components/HeroGraphic.tsx`) featuring glowing `<defs><linearGradient>...</linearGradient></defs>`, crisp `<path />` curves, geometric `<circle />` / `<rect />` layers, and customizable props (`{ className = \"w-10 h-10\" }`). Always write them as `export default function Logo({ className = \"w-8 h-8\" }: { className?: string }) { return (...) }`.",
    "4. USER-CENTRIC FLOW & PROACTIVE SUGGESTIONS:",
    "   - You must deeply understand the founder's workflow. At the very end of your `reply` string, you MUST ALWAYS include a dedicated section titled:",
    "     `💡 PROACTIVE ARCHITECT SUGGESTION:` followed by 1 or 2 specific, high-value recommendations on what the founder should ask you to build next to make their app convert better, run faster, or look more professional.",
    "5. STRICT CLEANUP & DELETION ENFORCEMENT: When instructed to clean up, replace, or remove old/unwanted text or headers from a file, you MUST do a thorough, clean rewrite of that file without leaving obsolete remnants behind.",
    "",
    "CRITICAL CODE RULES:",
    "1. Return ONLY valid JSON matching the exact schema below — no markdown ticks outside JSON, no conversational preambles.",
    "2. For updatedFiles: provide the COMPLETE modified file content for every existing file. Never return truncated snippets or placeholders (`// rest of code here` is STRICTLY FORBIDDEN).",
    "3. For newFiles: when instructed to create new pages (`app/pricing/page.tsx`) or components (`components/Logo.tsx`, `components/Footer.tsx`), return complete, beautifully styled Lovable-grade source code using `export default function ComponentName()` syntax.",
    "4. If an instruction requires editing MULTIPLE files (`app/page.tsx` AND `components/Navigation.tsx`), return BOTH complete files in updatedFiles.",
    "5. When modifying app/layout.tsx, NEVER remove the {children} placeholder.",
    "",
    "Required JSON Response Format:",
    "{",
    '  "reply": "Authoritative, professional summary explaining what architectural, logo, or visual enhancements were executed\\n\\n💡 PROACTIVE ARCHITECT SUGGESTION: Specific recommendation for what the user should build or refine next.",',
    '  "updatedFiles": [',
    "    {",
    '      "file_path": "app/page.tsx",',
    '      "content": "COMPLETE FULL FILE CONTENT HERE"',
    "    }",
    "  ],",
    '  "newFiles": [',
    "    {",
    '      "file_path": "components/Logo.tsx",',
    '      "content": "COMPLETE FULL FILE CONTENT HERE",',
    '      "language": "typescript"',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const userMessage = [
    `Instruction: "${input.instruction}"`,
    "",
    "Project's Current Files:",
    fileList,
    "",
    "Remember: Return ONLY valid JSON with complete file contents. Execute all upgrades with elite Lovable design standards, vector SVG logo mastery using standard function declarations, and always include a proactive architect suggestion at the end of your reply.",
  ].join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content || "{}";
    let parsed: {
      reply?: string;
      updatedFiles?: Array<{ file_path: string; content: string }>;
      newFiles?: Array<{ file_path: string; content: string; language?: string }>;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        reply: "JSON formatting error encountered during generation. Please try re-issuing the instruction.",
        updatedFiles: [],
        newFiles: [],
      };
    }

    const updatedFiles: UpdatedFile[] = [];
    if (Array.isArray(parsed.updatedFiles)) {
      for (const item of parsed.updatedFiles) {
        if (!item.file_path || !item.content || item.content.trim().length < 10) continue;
        const original = input.files.find(
          (f) => f.file_path.toLowerCase() === item.file_path.toLowerCase()
        );
        if (original) {
          updatedFiles.push({
            id: original.id,
            file_path: original.file_path,
            content: item.content,
          });
        }
      }
    }

    const newFiles: NewFile[] = [];
    if (Array.isArray(parsed.newFiles)) {
      for (const item of parsed.newFiles) {
        if (!item.file_path || !item.content || item.content.trim().length < 10) continue;
        const alreadyExists = input.files.find(
          (f) => f.file_path.toLowerCase() === item.file_path.toLowerCase()
        );
        if (alreadyExists) {
          updatedFiles.push({
            id: alreadyExists.id,
            file_path: alreadyExists.file_path,
            content: item.content,
          });
        } else {
          newFiles.push({
            file_path: item.file_path,
            content: item.content,
            language: item.language || (item.file_path.endsWith(".json") ? "json" : "typescript"),
          });
        }
      }
    }

    return {
      reply:
        parsed.reply ||
        "Done. Elite Lovable design upgrades and vector graphics applied successfully.\n\n💡 PROACTIVE ARCHITECT SUGGESTION: Check your preview and ask me to create custom sub-components or interactive sections anytime!",
      updatedFiles,
      newFiles,
    };
  } catch (error: any) {
    console.error("Real AI edit error:", error);
    return {
      reply: `Error: ${error.message || "OpenAI API request failed. Please check your API key configuration."}`,
      updatedFiles: [],
      newFiles: [],
    };
  }
}