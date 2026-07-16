// Shang Tsung Code Editor Service
// Handles AI-driven modifications to generated project files.
// Currently Mock mode. Flip USE_MOCK to false when OpenAI funds arrive.

const USE_MOCK = true;

interface EditInput {
  instruction: string;
  files: Array<{ id: string; file_path: string; content: string; language: string }>;
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

// MOCK EDITOR: Pattern matches instructions and modifies code directly
function mockEditCode(input: EditInput): EditResult {
  const instruction = input.instruction.toLowerCase().trim();
  const updatedFiles: Array<{ id: string; file_path: string; content: string }> = [];

  // Find the home page file
  const homePage = input.files.find((f) => f.file_path === "app/page.tsx");
  const layoutFile = input.files.find((f) => f.file_path === "app/layout.tsx");
  const navFile = input.files.find((f) => f.file_path === "components/Navigation.tsx");

  // --- COLOR CHANGES ---
  if (instruction.includes("orange") && instruction.includes("hero")) {
    if (homePage) {
      const updated = homePage.content.replace(
        /from-white to-slate-400/g,
        "from-orange-400 to-orange-600"
      );
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The hero title is now orange. Refresh the preview to see the change.", updatedFiles };
    }
  }

  if (instruction.includes("blue") && instruction.includes("hero")) {
    if (homePage) {
      const updated = homePage.content.replace(
        /from-white to-slate-400/g,
        "from-blue-400 to-blue-600"
      );
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The hero title is now blue. Refresh the preview.", updatedFiles };
    }
  }

  if (instruction.includes("white") && instruction.includes("hero")) {
    if (homePage) {
      const updated = homePage.content.replace(
        /from-\w+-\d+ to-\w+-\d+/g,
        "from-white to-slate-200"
      );
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The hero title is now white. Refresh the preview.", updatedFiles };
    }
  }

  // --- BUTTON CHANGES ---
  if (instruction.includes("button") && (instruction.includes("green") || instruction.includes("emerald"))) {
    if (homePage) {
      const updated = homePage.content.replace(
        /bg-orange-600 hover:bg-orange-500/g,
        "bg-emerald-600 hover:bg-emerald-500"
      );
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The primary button is now green. Refresh the preview.", updatedFiles };
    }
  }

  if (instruction.includes("button") && instruction.includes("orange")) {
    if (homePage) {
      const updated = homePage.content.replace(
        /bg-\w+-600 hover:bg-\w+-500/g,
        "bg-orange-600 hover:bg-orange-500"
      );
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The primary button is now orange. Refresh the preview.", updatedFiles };
    }
  }

  // --- BACKGROUND CHANGES ---
  if (instruction.includes("background") && instruction.includes("dark")) {
    if (homePage) {
      const updated = homePage.content.replace(/bg-slate-900/g, "bg-slate-950");
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The background is now darker. Refresh the preview.", updatedFiles };
    }
  }

  if (instruction.includes("background") && (instruction.includes("light") || instruction.includes("white"))) {
    if (homePage) {
      const updated = homePage.content.replace(/bg-slate-950/g, "bg-white").replace(/text-white/g, "text-slate-900");
      updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
      return { reply: "Done. The background is now light. Refresh the preview.", updatedFiles };
    }
  }

  // --- NAVIGATION CHANGES ---
  if (instruction.includes("nav") && (instruction.includes("remove") || instruction.includes("hide"))) {
    if (navFile) {
      const updated = navFile.content.replace(
        /<nav[\s\S]*?<\/nav>/,
        "<!-- Navigation hidden by Shang Tsung -->"
      );
      updatedFiles.push({ id: navFile.id, file_path: navFile.file_path, content: updated });
      return { reply: "Done. The navigation has been hidden. Refresh the preview.", updatedFiles };
    }
  }

  // --- TITLE CHANGES ---
  if (instruction.includes("title") || instruction.includes("heading")) {
    if (homePage) {
      const sizeMatch = instruction.match(/\b(small|smaller|large|larger|big|bigger)\b/);
      if (sizeMatch) {
        const isSmaller = ["small", "smaller"].includes(sizeMatch[1]);
        const updated = homePage.content.replace(
          /text-6xl font-extrabold/g,
          isSmaller ? "text-4xl font-bold" : "text-8xl font-black"
        );
        updatedFiles.push({ id: homePage.id, file_path: homePage.file_path, content: updated });
        return { reply: `Done. The heading is now ${sizeMatch[1]}. Refresh the preview.`, updatedFiles };
      }
    }
  }

  // --- FOOTER CHANGES ---
  if (instruction.includes("footer") && (instruction.includes("remove") || instruction.includes("hide"))) {
    const footerFile = input.files.find((f) => f.file_path === "app/layout.tsx");
    if (footerFile) {
      const updated = footerFile.content.replace(
        /<footer[\s\S]*?<\/footer>/,
        "<!-- Footer hidden by Shang Tsung -->"
      );
      updatedFiles.push({ id: footerFile.id, file_path: footerFile.file_path, content: updated });
      return { reply: "Done. The footer has been removed. Refresh the preview.", updatedFiles };
    }
  }

  // --- WHAT FILES EXIST ---
  if (instruction.includes("what files") || instruction.includes("list files") || instruction.includes("show files")) {
    const fileList = input.files.map((f) => `• ${f.file_path}`).join("\n");
    return {
      reply: `Here are your generated files:\n\n${fileList}\n\nTell me which file to modify.`,
      updatedFiles: [],
    };
  }

  // --- SHOW FILE CONTENT ---
  if (instruction.includes("show me") || instruction.includes("read")) {
    const fileMatch = input.files.find((f) =>
      instruction.includes(f.file_path.toLowerCase()) ||
      instruction.includes(f.file_name?.toLowerCase() || "")
    );
    if (fileMatch) {
      return {
        reply: `Here is the content of ${fileMatch.file_path}:\n\n\`\`\`\n${fileMatch.content.slice(0, 500)}...\n\`\`\``,
        updatedFiles: [],
      };
    }
  }

  // DEFAULT RESPONSE
  return {
    reply: [
      "I can edit your generated code. Try commands like:",
      "",
      "• \"Change the hero color to orange\"",
      "• \"Make the button green\"",
      "• \"Make the background dark\"",
      "• \"Make the heading larger\"",
      "• \"Hide the navigation\"",
      "• \"What files exist?\"",
      "",
      "What would you like to change?",
    ].join("\n"),
    updatedFiles: [],
  };
}

// REAL AI EDITOR: Activates when USE_MOCK = false
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
        content: `You are Shang Tsung, a code editor AI inside App Builder Studio.
You receive generated Next.js + Tailwind project files and the user's edit instruction.
You must respond with ONLY valid JSON in this format:
{
  "reply": "Explanation of what you changed",
  "updatedFiles": [
    { "file_path": "app/page.tsx", "content": "full updated file content here" }
  ]
}
Only include files that actually changed. Return the complete file content, not just the changed part.`,
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
    .map((updated: { file_path: string; content: string }) => {
      const original = input.files.find((f) => f.file_path === updated.file_path);
      if (!original) return null;
      return { id: original.id, file_path: updated.file_path, content: updated.content };
    })
    .filter(Boolean);

  return {
    reply: result.reply || "Done. Refresh the preview to see changes.",
    updatedFiles,
  };
}