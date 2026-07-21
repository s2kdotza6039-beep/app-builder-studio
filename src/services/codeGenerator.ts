import { OpenAI } from "openai";

const USE_MOCK = false;

interface GenerateCodeInput {
  appName: string;
  appDescription: string;
  routes: Array<{ page_name: string; route_path: string; purpose: string | null }>;
  features: Array<{ feature_name: string; priority: string | null }>;
  databaseTables: Array<{ table_name: string; purpose: string | null; fields_json: any }>;
}

export interface GeneratedFile {
  file_path: string;
  content: string;
  language: string;
}

export async function generateProjectCode(input: GenerateCodeInput): Promise<GeneratedFile[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (USE_MOCK || !apiKey) {
    return generateMockLovableCode(input);
  }

  try {
    return await generateOpenAILovableCode(input, apiKey);
  } catch (error) {
    console.error("OpenAI generation failed, falling back to Lovable template generator:", error);
    return generateMockLovableCode(input);
  }
}

async function generateOpenAILovableCode(input: GenerateCodeInput, apiKey: string): Promise<GeneratedFile[]> {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = [
    "You are the elite AI Engine inside App Builder Studio by S2KDOTZA Entertainment.",
    "Your role is to generate a complete, production-ready, highly secure Next.js App Router project whose visual quality matches high-end platforms like Lovable, v0, and Bolt.",
    "",
    "DESIGN SYSTEM & ARCHITECTURE REQUIREMENTS:",
    "1. Modern Glassmorphism & Depth: Use #09090b (zinc-950) or #020617 (slate-950) backgrounds with ambient gradient blurs (bg-gradient-to-tr from-orange-500/15 via-indigo-500/10 to-transparent blur-[140px]).",
    "2. Cards & Containers: Style cards with border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all duration-300.",
    "3. Typography Scale: Use text-5xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-400 for main headings.",
    "4. Navigation (components/Navigation.tsx): Create a sticky, glassmorphic top navbar (sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-4) with smooth hover links (text-zinc-400 hover:text-white transition).",
    "5. Footer (components/Footer.tsx): Create a clean, elegant footer displaying copyright by S2KDOTZA Entertainment.",
    "6. Return ONLY valid JSON with complete code files. Never emit placeholder comments or partial code.",
    "",
    "Required JSON Schema:",
    "{",
    '  "files": [',
    '    { "file_path": "app/layout.tsx", "content": "FULL SOURCE CODE", "language": "typescript" },',
    '    { "file_path": "components/Navigation.tsx", "content": "FULL SOURCE CODE", "language": "typescript" },',
    '    { "file_path": "components/Footer.tsx", "content": "FULL SOURCE CODE", "language": "typescript" },',
    '    { "file_path": "app/page.tsx", "content": "FULL SOURCE CODE", "language": "typescript" },',
    '    { "file_path": "package.json", "content": "FULL SOURCE CODE", "language": "json" },',
    '    { "file_path": "README.md", "content": "FULL SOURCE CODE", "language": "markdown" }',
    "  ]",
    "}",
  ].join("\n");

  const userMessage = [
    `Generate a Lovable-grade application for:`,
    `App Name: "${input.appName}"`,
    `Description: "${input.appDescription}"`,
    "",
    "Planned Routes:",
    ...input.routes.map((r) => `- ${r.page_name} (${r.route_path}): ${r.purpose || ""}`),
    "",
    "Planned Features:",
    ...input.features.map((f) => `- ${f.feature_name} [${f.priority || "Medium"}]`),
    "",
    "Planned Tables:",
    ...input.databaseTables.map((t) => `- ${t.table_name}: ${t.purpose || ""}`),
    "",
    "Remember: Return ONLY valid JSON containing complete, production-ready files for layout.tsx, Navigation.tsx, Footer.tsx, page.tsx, and every planned route page (app/[route]/page.tsx).",
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 10000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed.files) && parsed.files.length > 0) {
    return parsed.files.map((f: any) => ({
      file_path: f.file_path,
      content: f.content,
      language: f.language || (f.file_path.endsWith(".json") ? "json" : "typescript"),
    }));
  }

  return generateMockLovableCode(input);
}

function generateMockLovableCode(input: GenerateCodeInput): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    file_path: "app/layout.tsx",
    language: "typescript",
    content: [
      'import type { Metadata } from "next";',
      'import "./globals.css";',
      'import Navigation from "@/components/Navigation";',
      'import Footer from "@/components/Footer";',
      "",
      `export const metadata: Metadata = {`,
      `  title: "${input.appName} — App Builder Studio",`,
      `  description: "${input.appDescription}",`,
      `};`,
      "",
      "export default function RootLayout({ children }: { children: React.ReactNode }) {",
      "  return (",
      '    <html lang="en" className="dark">',
      '      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-orange-500 selection:text-white flex flex-col">',
      "        <Navigation />",
      '        <div className="flex-1">{children}</div>',
      "        <Footer />",
      "      </body>",
      "    </html>",
      "  );",
      "}",
    ].join("\n"),
  });

  files.push({
    file_path: "components/Navigation.tsx",
    language: "typescript",
    content: [
      'import Link from "next/link";',
      "",
      "export default function Navigation() {",
      "  return (",
      '    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-4">',
      '      <div className="max-w-6xl mx-auto flex items-center justify-between">',
      '        <Link href="/" className="text-xl font-black text-white flex items-center gap-2 tracking-tight">',
      '          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs shadow-md shadow-orange-500/20">⚡</span>',
      `          <span>${input.appName}</span>`,
      "        </Link>",
      '        <nav className="flex items-center gap-6 text-sm font-medium">',
      '          <Link href="/" className="text-zinc-400 hover:text-white transition">Home</Link>',
      ...input.routes
        .filter((r) => r.route_path !== "/")
        .slice(0, 5)
        .map(
          (r) =>
            `          <Link href="${r.route_path}" className="text-zinc-400 hover:text-white transition">${r.page_name}</Link>`
        ),
      "        </nav>",
      "      </div>",
      "    </header>",
      "  );",
      "}",
    ].join("\n"),
  });

  files.push({
    file_path: "components/Footer.tsx",
    language: "typescript",
    content: [
      "export default function Footer() {",
      "  return (",
      '    <footer className="border-t border-white/10 bg-[#09090b] py-10 px-6 mt-20">',
      '      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">',
      `        <p>© ${new Date().getFullYear()} ${input.appName}. Precision engineered with App Builder Studio.</p>`,
      '        <p className="flex items-center gap-1">Powered by <span className="text-orange-400 font-semibold">S2KDOTZA Entertainment 🇿🇦</span></p>',
      "      </div>",
      "    </footer>",
      "  );",
      "}",
    ].join("\n"),
  });

  files.push({
    file_path: "app/page.tsx",
    language: "typescript",
    content: [
      'import Link from "next/link";',
      "",
      "export default function HomePage() {",
      "  return (",
      '    <main className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center items-center px-6">',
      '      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-orange-500/15 via-indigo-500/15 to-purple-500/10 blur-[140px] pointer-events-none -z-10" />',
      '      <section className="max-w-5xl mx-auto text-center py-20 relative z-10">',
      '        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-orange-400 mb-8 shadow-inner">',
      '          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Lovable-Grade Architecture Live',
      "        </div>",
      '        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent leading-[1.1]">',
      `          ${input.appName}`,
      "        </h1>",
      '        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">',
      `          ${input.appDescription}`,
      "        </p>",
      '        <div className="flex flex-wrap gap-4 justify-center mb-20">',
      '          <Link href="/dashboard" className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-8 py-4 font-bold text-white shadow-2xl shadow-orange-600/30 hover:-translate-y-0.5 transition-all duration-300">',
      "            Explore Platform",
      "          </Link>",
      '          <Link href="/about" className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md px-8 py-4 font-bold text-zinc-300 hover:text-white transition-all duration-300">',
      "            System Architecture",
      "          </Link>",
      "        </div>",
      '        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 text-left">',
      ...input.features.slice(0, 6).map((f) =>
        [
          '          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300">',
          '            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold mb-4">⚡</div>',
          `            <h3 className="font-bold text-white text-lg mb-2">${f.feature_name}</h3>`,
          '            <p className="text-xs text-zinc-400 leading-relaxed">High-performance module managed by App Builder Studio.</p>',
          "          </div>",
        ].join("\n")
      ),
      "        </div>",
      "      </section>",
      "    </main>",
      "  );",
      "}",
    ].join("\n"),
  });

  input.routes.forEach((route) => {
    if (route.route_path === "/" || route.route_path === "") return;
    const cleanPath = route.route_path.replace(/^\//, "").replace(/\//g, "-");
    const componentName = route.page_name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

    files.push({
      file_path: `app/${cleanPath}/page.tsx`,
      language: "typescript",
      content: [
        `export default function ${componentName}Page() {`,
        "  return (",
        '    <main className="max-w-6xl mx-auto px-6 py-20 min-h-[80vh] text-white">',
        '      <div className="border border-white/10 bg-white/[0.03] backdrop-blur-md rounded-3xl p-10 shadow-2xl">',
        '        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-6">',
        `          Route: ${route.route_path}`,
        "        </div>",
        `        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">${route.page_name}</h1>`,
        `        <p className="text-zinc-400 max-w-2xl mb-10 leading-relaxed">${route.purpose || `Dedicated workspace section for ${input.appName}.`}</p>`,
        '        <div className="p-8 rounded-2xl border border-white/10 bg-black/40 font-mono text-xs text-zinc-400">',
        `          // Lovable-grade component container initialized for ${route.page_name}.`,
        "        </div>",
        "      </div>",
        "    </main>",
        "  );",
        "}",
      ].join("\n"),
    });
  });

  files.push({
    file_path: "package.json",
    language: "json",
    content: JSON.stringify(
      {
        name: input.appName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {
          next: "^15.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
          "lucide-react": "^0.400.0",
        },
        devDependencies: {
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^3.4.0",
        },
      },
      null,
      2
    ),
  });

  files.push({
    file_path: "README.md",
    language: "markdown",
    content: [
      `# ${input.appName}`,
      "",
      `${input.appDescription}`,
      "",
      "## Built with App Builder Studio (Lovable-Grade Architecture)",
      "",
      "### Quick Start",
      "```bash",
      "npm install",
      "npm run dev",
      "```",
      "",
      "### Routes & Features",
      ...input.routes.map((r) => `- **${r.page_name}** (${r.route_path})`),
      "",
      "Precision engineered by **S2KDOTZA Entertainment 🇿🇦**.",
    ].join("\n"),
  });

  return files;
}