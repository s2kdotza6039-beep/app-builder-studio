// Code generation service.
// Currently uses mock templates. Later swaps to OpenAI when funds arrive.

const USE_MOCK = true;

interface GenerateCodeInput {
  appName: string;
  appDescription: string;
  routes: Array<{ page_name: string; route_path: string; purpose: string | null }>;
  features: Array<{ feature_name: string; priority: string | null }>;
  databaseTables: Array<{ table_name: string; purpose: string | null; fields_json: any }>;
}

export interface GeneratedFile {
  file_path: string;   // e.g., "app/page.tsx"
  content: string;     // The actual code
  language: string;    // e.g., "typescript", "json", "markdown"
}

export async function generateProjectCode(
  input: GenerateCodeInput
): Promise<GeneratedFile[]> {
  if (USE_MOCK) {
    return generateMockCode(input);
  }
  return generateMockCode(input);
}

function generateMockCode(input: GenerateCodeInput): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // 1. Home / Landing Page
  files.push({
    file_path: "app/page.tsx",
    language: "typescript",
    content: generateHomePage(input),
  });

  // 2. Route pages (skip home since already generated)
  input.routes.forEach((route) => {
    if (route.route_path === "/") return;

    const cleanPath = route.route_path.replace(/^\//, "").replace(/\//g, "-");
    files.push({
      file_path: `app/${cleanPath}/page.tsx`,
      language: "typescript",
      content: generateRoutePage(route, input),
    });
  });

  // 3. Root layout
  files.push({
    file_path: "app/layout.tsx",
    language: "typescript",
    content: generateLayout(input),
  });

  // 4. Navigation component
  files.push({
    file_path: "components/Navigation.tsx",
    language: "typescript",
    content: generateNavigation(input),
  });

  // 5. Package.json
  files.push({
    file_path: "package.json",
    language: "json",
    content: generatePackageJson(input),
  });

  // 6. README.md
  files.push({
    file_path: "README.md",
    language: "markdown",
    content: generateReadme(input),
  });

  return files;
}

function generateHomePage(input: GenerateCodeInput): string {
  return `import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Navigation />
      
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-bold mb-6">
          ${input.appName}
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          ${input.appDescription}
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth"
            className="rounded-xl bg-orange-600 hover:bg-orange-500 px-8 py-4 font-semibold transition"
          >
            Get Started
          </Link>
          <Link
            href="/about"
            className="rounded-xl border border-slate-700 hover:bg-slate-800 px-8 py-4 font-semibold transition"
          >
            Learn More
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-10 text-center">Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
${input.features
  .slice(0, 6)
  .map(
    (f) => `          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-xl font-bold mb-2">${f.feature_name}</h3>
            <p className="text-slate-400 text-sm">Powered by our platform</p>
          </div>`
  )
  .join("\n")}
        </div>
      </section>
    </main>
  );
}
`;
}

function generateRoutePage(
  route: { page_name: string; route_path: string; purpose: string | null },
  input: GenerateCodeInput
): string {
  const componentName = route.page_name.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `import Navigation from "@/components/Navigation";

export default function ${componentName}Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navigation />
      
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6">${route.page_name}</h1>
        <p className="text-slate-400 mb-8">
          ${route.purpose || "This page is part of " + input.appName}
        </p>

        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-slate-300">
            Content for the ${route.page_name} page will go here.
          </p>
        </div>
      </section>
    </main>
  );
}
`;
}

function generateLayout(input: GenerateCodeInput): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${input.appName}",
  description: "${input.appDescription}",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function generateNavigation(input: GenerateCodeInput): string {
  const navLinks = input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) => `        <Link href="${r.route_path}" className="text-slate-300 hover:text-white transition">${r.page_name}</Link>`
    )
    .join("\n");

  return `import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          ${input.appName}
        </Link>
        
        <div className="flex items-center gap-6">
${navLinks}
        </div>
      </div>
    </nav>
  );
}
`;
}

function generatePackageJson(input: GenerateCodeInput): string {
  return JSON.stringify(
    {
      name: input.appName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      version: "0.1.0",
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
  );
}

function generateReadme(input: GenerateCodeInput): string {
  return `# ${input.appName}

${input.appDescription}

## Pages
${input.routes.map((r) => `- ${r.page_name} (${r.route_path})`).join("\n")}

## Features
${input.features.map((f) => `- ${f.feature_name}`).join("\n")}

## Database Tables
${input.databaseTables.map((t) => `- ${t.table_name}`).join("\n")}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Built with App Builder Studio by S2KDOTZA Entertainment.
`;
}