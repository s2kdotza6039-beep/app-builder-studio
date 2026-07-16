// Shang Tsung Code Editor Service
// Mock mode: pattern-matches instructions and modifies code directly.
// Flip USE_MOCK to false when OpenAI funds arrive for intelligent editing.

const USE_MOCK = true;

interface EditInput {
  instruction: string;
  files: Array<{
    id: string;
    file_path: string;
    content: string;
    language: string;
  }>;
}

export interface EditResult {
  reply: string;
  updatedFiles: Array<{ id: string; file_path: string; content: string }>;
}

export async function editProjectCode(input: EditInput): Promise<EditResult> {
  if (USE_MOCK) {
    return mockEditCode(input);
  }
  return realAIEditCode(input);
}

function mockEditCode(input: EditInput): EditResult {
  const raw = input.instruction.toLowerCase().trim();
  const updated: Array<{ id: string; file_path: string; content: string }> = [];

  // Helper: find files by path
  const file = (path: string) => input.files.find((f) => f.file_path === path);
  const home = file("app/page.tsx");
  const nav = file("components/Navigation.tsx");
  const layout = file("app/layout.tsx");
  const readme = file("README.md");

  // Helper: push update
  function push(f: typeof home, newContent: string) {
    if (!f) return false;
    updated.push({ id: f.id, file_path: f.file_path, content: newContent });
    return true;
  }

  // ─── HERO COLORS ───────────────────────────────────────────────────────────
  if (raw.includes("hero") && raw.includes("orange")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-orange-400 to-orange-600")))
      return { reply: "Done. The hero title is now orange. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("blue")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-blue-400 to-blue-600")))
      return { reply: "Done. The hero title is now blue. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("green")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-emerald-400 to-emerald-600")))
      return { reply: "Done. The hero title is now green. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("purple")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-purple-400 to-purple-600")))
      return { reply: "Done. The hero title is now purple. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("white")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-white to-slate-200")))
      return { reply: "Done. The hero title is now white. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("red")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-red-400 to-red-600")))
      return { reply: "Done. The hero title is now red. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("hero") && raw.includes("gold") || raw.includes("hero") && raw.includes("yellow")) {
    if (push(home, home!.content.replace(/from-\S+ to-\S+/g, "from-yellow-400 to-amber-500")))
      return { reply: "Done. The hero title is now gold. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── BUTTON COLORS ─────────────────────────────────────────────────────────
  if (raw.includes("button") && raw.includes("green")) {
    if (push(home, home!.content.replace(/bg-orange-600 hover:bg-orange-500/g, "bg-emerald-600 hover:bg-emerald-500")))
      return { reply: "Done. The primary button is now green. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("button") && raw.includes("blue")) {
    if (push(home, home!.content.replace(/bg-orange-600 hover:bg-orange-500/g, "bg-blue-600 hover:bg-blue-500")))
      return { reply: "Done. The primary button is now blue. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("button") && raw.includes("orange")) {
    if (push(home, home!.content.replace(/bg-\w+-600 hover:bg-\w+-500/g, "bg-orange-600 hover:bg-orange-500")))
      return { reply: "Done. The primary button is now orange. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("button") && raw.includes("purple")) {
    if (push(home, home!.content.replace(/bg-orange-600 hover:bg-orange-500/g, "bg-purple-600 hover:bg-purple-500")))
      return { reply: "Done. The primary button is now purple. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("button") && raw.includes("red")) {
    if (push(home, home!.content.replace(/bg-orange-600 hover:bg-orange-500/g, "bg-red-600 hover:bg-red-500")))
      return { reply: "Done. The primary button is now red. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── BACKGROUND COLORS ─────────────────────────────────────────────────────
  if (raw.includes("background") && (raw.includes("darker") || raw.includes("dark"))) {
    if (push(home, home!.content.replace(/bg-slate-900/g, "bg-slate-950")))
      return { reply: "Done. The background is now darker. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("background") && (raw.includes("lighter") || raw.includes("light") || raw.includes("white"))) {
    const updated2 = home!.content.replace(/bg-slate-950/g, "bg-slate-100").replace(/text-white/g, "text-slate-900").replace(/bg-slate-900/g, "bg-white");
    if (push(home, updated2))
      return { reply: "Done. The background is now light. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── HEADING SIZE ──────────────────────────────────────────────────────────
  if ((raw.includes("heading") || raw.includes("title")) && (raw.includes("larger") || raw.includes("bigger") || raw.includes("large") || raw.includes("big"))) {
    if (push(home, home!.content.replace(/text-6xl font-extrabold/g, "text-8xl font-black")))
      return { reply: "Done. The heading is now larger. Preview refreshed. ✅", updatedFiles: updated };
  }
  if ((raw.includes("heading") || raw.includes("title")) && (raw.includes("smaller") || raw.includes("small"))) {
    if (push(home, home!.content.replace(/text-6xl font-extrabold|text-8xl font-black/g, "text-4xl font-bold")))
      return { reply: "Done. The heading is now smaller. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────────────
  if ((raw.includes("nav") || raw.includes("navigation") || raw.includes("header")) && (raw.includes("remove") || raw.includes("hide") || raw.includes("delete"))) {
    if (push(nav, "// Navigation hidden by Shang Tsung\nexport default function Navigation() { return null; }"))
      return { reply: "Done. The navigation has been hidden. Preview refreshed. ✅", updatedFiles: updated };
  }
  if ((raw.includes("nav") || raw.includes("navigation")) && (raw.includes("dark") || raw.includes("black"))) {
    if (push(nav, nav!.content.replace(/bg-slate-900/g, "bg-black").replace(/border-slate-800/g, "border-slate-900")))
      return { reply: "Done. The navigation is now black. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  if (raw.includes("footer") && (raw.includes("remove") || raw.includes("hide") || raw.includes("delete"))) {
    if (layout) {
      const updated2 = layout.content.replace(/<footer[\s\S]*?<\/footer>/g, "<!-- Footer removed by Shang Tsung -->");
      if (push(layout, updated2))
        return { reply: "Done. The footer has been removed. Preview refreshed. ✅", updatedFiles: updated };
    }
  }

  // ─── ADD PRICING SECTION ───────────────────────────────────────────────────
  if (raw.includes("pricing") && (raw.includes("add") || raw.includes("create") || raw.includes("section"))) {
    if (home) {
      const pricingSection = `
      {/* Pricing Section - Added by Shang Tsung */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-900">
        <h2 className="text-4xl font-bold mb-10 text-center">Pricing Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {["Free", "Pro", "Business"].map((plan, i) => (
            <div key={plan} className={\`p-8 rounded-2xl border \${i === 1 ? "border-orange-700 bg-orange-950/20" : "border-slate-800 bg-slate-900"}\`}>
              <h3 className="text-xl font-bold mb-2">{plan}</h3>
              <p className="text-3xl font-black mb-6">{i === 0 ? "$0" : i === 1 ? "$19" : "$49"}<span className="text-sm text-slate-400">/mo</span></p>
              <button className={\`w-full py-3 rounded-xl font-semibold text-sm \${i === 1 ? "bg-orange-600 hover:bg-orange-500" : "border border-slate-700 hover:bg-slate-900"} transition\`}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>`;
      const insertPoint = home.content.lastIndexOf("</main>");
      const updated2 = home.content.slice(0, insertPoint) + pricingSection + home.content.slice(insertPoint);
      if (push(home, updated2))
        return { reply: "Done. A 3-tier pricing section has been added to the homepage. Preview refreshed. ✅", updatedFiles: updated };
    }
  }

  // ─── ADD TESTIMONIALS SECTION ──────────────────────────────────────────────
  if (raw.includes("testimonial") || raw.includes("review") || raw.includes("feedback")) {
    if (home) {
      const testimonialSection = `
      {/* Testimonials - Added by Shang Tsung */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-900">
        <h2 className="text-4xl font-bold mb-10 text-center">What People Are Saying</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: "Alex M.", text: "This app changed how I build software. Incredible." },
            { name: "Sarah K.", text: "Finally an app builder that actually works." },
            { name: "James R.", text: "Built my startup app in one afternoon. Mind-blowing." }
          ].map((t) => (
            <div key={t.name} className="p-6 rounded-2xl border border-slate-800 bg-slate-900">
              <p className="text-slate-300 text-sm mb-4">"{t.text}"</p>
              <p className="font-bold text-sm text-orange-400">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>`;
      const insertPoint = home.content.lastIndexOf("</main>");
      const updated2 = home.content.slice(0, insertPoint) + testimonialSection + home.content.slice(insertPoint);
      if (push(home, updated2))
        return { reply: "Done. A testimonials section has been added. Preview refreshed. ✅", updatedFiles: updated };
    }
  }

  // ─── ADD FAQ SECTION ───────────────────────────────────────────────────────
  if (raw.includes("faq") || raw.includes("frequently asked") || raw.includes("questions")) {
    if (home) {
      const faqSection = `
      {/* FAQ - Added by Shang Tsung */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-900">
        <h2 className="text-4xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: "Do I need coding experience?", a: "No. Describe your idea in plain language and the AI handles the rest." },
            { q: "Can I download my code?", a: "Yes. Every generated project can be downloaded as a complete ZIP file." },
            { q: "Is my code mine?", a: "100%. You own everything you generate. No lock-in, no restrictions." },
          ].map((item) => (
            <div key={item.q} className="border border-slate-800 bg-slate-900 rounded-xl p-6">
              <p className="font-bold mb-2">{item.q}</p>
              <p className="text-sm text-slate-400">{item.a}</p>
            </div>
          ))}
        </div>
      </section>`;
      const insertPoint = home.content.lastIndexOf("</main>");
      const updated2 = home.content.slice(0, insertPoint) + faqSection + home.content.slice(insertPoint);
      if (push(home, updated2))
        return { reply: "Done. A FAQ section has been added. Preview refreshed. ✅", updatedFiles: updated };
    }
  }

  // ─── RENAME APP ────────────────────────────────────────────────────────────
  const renameMatch = raw.match(/rename.*?to\s+"?([^"]+)"?$/) || raw.match(/change.*?name.*?to\s+"?([^"]+)"?$/);
  if (renameMatch) {
    const newName = renameMatch[1].trim();
    const capitalised = newName.charAt(0).toUpperCase() + newName.slice(1);
    let changed = false;
    if (home) { push(home, home.content.replace(/[A-Z][a-zA-Z\s]+(?=<\/h1>)/g, capitalised)); changed = true; }
    if (nav) { push(nav, nav.content.replace(/<span[^>]*>[^<]+<\/span>/g, `<span>${capitalised}</span>`)); }
    if (changed) return { reply: `Done. The app has been renamed to "${capitalised}". Preview refreshed. ✅`, updatedFiles: updated };
  }

  // ─── FONT CHANGES ──────────────────────────────────────────────────────────
  if (raw.includes("font") && raw.includes("mono")) {
    if (push(home, home!.content.replace(/font-sans/g, "font-mono")))
      return { reply: "Done. The font is now monospace. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("font") && (raw.includes("sans") || raw.includes("normal"))) {
    if (push(home, home!.content.replace(/font-mono/g, "font-sans")))
      return { reply: "Done. The font is now sans-serif. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── ROUNDED CORNERS ───────────────────────────────────────────────────────
  if (raw.includes("round") && (raw.includes("more") || raw.includes("full"))) {
    if (push(home, home!.content.replace(/rounded-xl/g, "rounded-3xl").replace(/rounded-2xl/g, "rounded-3xl")))
      return { reply: "Done. Corners are now more rounded. Preview refreshed. ✅", updatedFiles: updated };
  }
  if (raw.includes("round") && (raw.includes("less") || raw.includes("sharp") || raw.includes("square"))) {
    if (push(home, home!.content.replace(/rounded-3xl/g, "rounded-lg").replace(/rounded-2xl/g, "rounded-lg").replace(/rounded-xl/g, "rounded-lg")))
      return { reply: "Done. Corners are now sharper. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── SPACING ───────────────────────────────────────────────────────────────
  if (raw.includes("more space") || raw.includes("more padding") || raw.includes("spacing")) {
    if (push(home, home!.content.replace(/py-16/g, "py-24").replace(/py-20/g, "py-32").replace(/mb-6/g, "mb-10")))
      return { reply: "Done. Spacing has been increased. Preview refreshed. ✅", updatedFiles: updated };
  }

  // ─── INFO COMMANDS ─────────────────────────────────────────────────────────
  if (raw.includes("what files") || raw.includes("list files") || raw.includes("show files")) {
    const list = input.files.map((f) => `• ${f.file_path} (${f.language})`).join("\n");
    return { reply: `Here are your generated files:\n\n${list}\n\nTell me which one to modify.`, updatedFiles: [] };
  }

  if (raw.includes("what can you do") || raw.includes("help") || raw.includes("commands")) {
    return {
      reply: [
        "Here is what I can do:\n",
        "🎨 COLORS",
        "• Change the hero color to orange/blue/green/purple/red/gold",
        "• Make the button green/blue/orange/purple/red",
        "• Make the background dark/light\n",
        "📐 LAYOUT",
        "• Make the heading larger/smaller",
        "• Make the corners more/less rounded",
        "• Add more spacing/padding\n",
        "🧩 SECTIONS",
        "• Add a pricing section",
        "• Add a testimonials section",
        "• Add a FAQ section\n",
        "🔧 STRUCTURE",
        "• Hide the navigation",
        "• Remove the footer",
        "• Rename the app to [new name]",
        "• Change the font to mono/sans\n",
        "📋 INFO",
        "• What files exist?",
        "• What can you do?",
      ].join("\n"),
      updatedFiles: [],
    };
  }

  // ─── DEFAULT ───────────────────────────────────────────────────────────────
  return {
    reply: [
      "I didn't recognise that specific command.",
      "",
      "Try these examples:",
      "• \"Change the hero color to orange\"",
      "• \"Add a pricing section\"",
      "• \"Make the button green\"",
      "• \"What can you do?\" — for the full list",
    ].join("\n"),
    updatedFiles: [],
  };
}

// REAL AI EDITOR — Activates when USE_MOCK = false
async function realAIEditCode(input: EditInput): Promise<EditResult> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const fileList = input.files
    .map((f) => `File: ${f.file_path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Shang Tsung, a code editor AI inside App Builder Studio by S2KDOTZA Entertainment.
You receive Next.js + Tailwind code files and an edit instruction.
Respond with ONLY valid JSON:
{
  "reply": "What you changed and why",
  "updatedFiles": [{ "file_path": "app/page.tsx", "content": "full file content" }]
}
Only include changed files. Return complete file content, never partial.`,
      },
      {
        role: "user",
        content: `Instruction: "${input.instruction}"\n\nFiles:\n${fileList}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");

  const updatedFiles = (result.updatedFiles || [])
    .map((u: { file_path: string; content: string }) => {
      const original = input.files.find((f) => f.file_path === u.file_path);
      if (!original) return null;
      return { id: original.id, file_path: u.file_path, content: u.content };
    })
    .filter(Boolean);

  return { reply: result.reply || "Done.", updatedFiles };
}