// Preview Generator V2
// Reads actual generated file content and renders it as interactive HTML.
// Falls back to planning-based preview if no files have been generated yet.

interface PreviewInput {
  appName: string;
  appDescription: string;
  routes: Array<{
    page_name: string;
    route_path: string;
    purpose: string | null;
  }>;
  features: Array<{
    feature_name: string;
    priority: string | null;
  }>;
  databaseTables: Array<{
    table_name: string;
    purpose: string | null;
  }>;
}

interface GeneratedFile {
  file_path: string;
  content: string;
  language: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// Called by the preview API route.
// If generated files exist, render them. Otherwise fall back to planning data.
// ─────────────────────────────────────────────────────────────────────────────

export function generatePreviewHTML(
  input: PreviewInput,
  currentPath: string = "/",
  generatedFiles: GeneratedFile[] = []
): string {
  const normalizedPath = currentPath.startsWith("/")
    ? currentPath
    : `/${currentPath}`;

  // If files exist, use V2 (renders actual generated code)
  if (generatedFiles.length > 0) {
    return renderFromGeneratedFiles(input, normalizedPath, generatedFiles);
  }

  // Fall back to V1 (planning-based preview)
  return renderFromPlanningData(input, normalizedPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW V2: Render from actual generated file content
// ─────────────────────────────────────────────────────────────────────────────

function renderFromGeneratedFiles(
  input: PreviewInput,
  currentPath: string,
  files: GeneratedFile[]
): string {
  // Find the correct page file for the current path
  const pageFile = findPageFile(currentPath, files);
  const navFile = files.find((f) => f.file_path === "components/Navigation.tsx");

  // Extract JSX content from the file and convert to renderable HTML
  const pageContent = pageFile
    ? convertTSXToHTML(pageFile.content, input)
    : renderNotFoundContent(currentPath, input);

  const navContent = navFile
    ? convertNavToHTML(navFile.content, input, currentPath)
    : renderDefaultNav(input, currentPath);

  // Build navigation links for the nav script
  const navLinks = input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) =>
        `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(r.route_path)}')" class="px-3 py-2 rounded-lg text-sm font-medium ${
          currentPath === r.route_path
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
        } transition cursor-pointer">${escapeHtml(r.page_name)}</a>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(input.appName)} — Preview V2</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    function navigate(path) {
      window.location.href = '?path=' + path;
    }
  </script>
</head>
<body class="bg-slate-950 text-white min-h-full flex flex-col font-sans antialiased">

  <!-- Navigation -->
  <nav class="border-b border-slate-800 bg-slate-900 px-6 py-4 sticky top-0 z-50">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="javascript:void(0)" onclick="navigate('%2F')" class="text-xl font-bold text-white flex items-center gap-2 cursor-pointer">
        <span class="text-orange-500">⚡</span> ${escapeHtml(input.appName)}
      </a>
      <div class="flex items-center gap-2">
        ${navLinks}
      </div>
    </div>
  </nav>

  <!-- Page Content -->
  <div class="flex-1">
    ${pageContent}
  </div>

  <!-- Preview Badge -->
  <div class="fixed bottom-4 right-4 bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg z-50">
    Preview V2 — Live Code
  </div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Find the correct page file for a given route path
// ─────────────────────────────────────────────────────────────────────────────

function findPageFile(
  path: string,
  files: GeneratedFile[]
): GeneratedFile | undefined {
  // Home page
  if (path === "/") {
    return files.find((f) => f.file_path === "app/page.tsx");
  }

  // Strip leading slash and find matching file
  const stripped = path.replace(/^\//, "");
  return (
    files.find((f) => f.file_path === `app/${stripped}/page.tsx`) ||
    files.find((f) => f.file_path === `app/${stripped}.tsx`)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert TSX file content into renderable HTML sections
// Extracts the JSX return block and replaces React/Next.js syntax
// with plain HTML + Tailwind so it renders correctly in the iframe
// ─────────────────────────────────────────────────────────────────────────────

function convertTSXToHTML(tsx: string, input: PreviewInput): string {
  let html = tsx;

  // Remove TypeScript / React imports
  html = html.replace(/^import\s+.*?;?\s*$/gm, "");
  html = html.replace(/^export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/m, "");
  html = html.replace(/^\}\s*$/m, "");

  // Remove "use client" directive
  html = html.replace(/["']use client["'];?\s*/g, "");

  // Replace className= with class= (HTML standard)
  html = html.replace(/className=/g, "class=");

  // Replace Next.js Link with plain anchor + onclick navigation
  html = html.replace(
    /<Link\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Link>/g,
    (_, href, children) => {
      const encoded = encodeURIComponent(href);
      return `<a href="javascript:void(0)" onclick="navigate('${encoded}')" class="cursor-pointer">${children}</a>`;
    }
  );

  // Replace Next.js Image with plain img
  html = html.replace(
    /<Image\s+src=["']([^"']+)["'][^/]*(\/?)>/g,
    (_, src) => `<img src="${src}" class="w-full h-auto" />`
  );

  // Remove React fragment tags
  html = html.replace(/<>|<\/>/g, "");

  // Replace {" "} with space
  html = html.replace(/\{" "\}/g, " ");

  // Replace template literals in JSX
  html = html.replace(/\{`([^`]*)`\}/g, (_, content) => content);

  // Replace simple string interpolations
  html = html.replace(/\{escapeHtml\(([^)]+)\)\}/g, "");

  // Remove TypeScript type annotations
  html = html.replace(/:\s*\w+(\[\])?(\s*\|\s*\w+(\[\])?)*(?=\s*[=,)}\n])/g, "");

  // Clean up return statement
  html = html.replace(/^\s*return\s*\(/m, "");
  html = html.replace(/\);\s*$/m, "");

  // Replace variable expressions in curly braces with app name
  html = html.replace(/\{[^{}]*appName[^{}]*\}/g, escapeHtml(input.appName));
  html = html.replace(/\{[^{}]*appDescription[^{}]*\}/g, escapeHtml(input.appDescription));

  // Remove remaining JSX expressions that can't be evaluated
  html = html.replace(/\{[^{}]*\}/g, "");

  // Clean up extra blank lines
  html = html.replace(/\n{3,}/g, "\n\n");

  return html.trim() || renderFallbackContent(input);
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert Navigation TSX to HTML
// ─────────────────────────────────────────────────────────────────────────────

function convertNavToHTML(
  tsx: string,
  input: PreviewInput,
  currentPath: string
): string {
  const links = input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) =>
        `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(r.route_path)}')" class="text-slate-300 hover:text-white text-sm px-3 py-2 rounded-lg ${
          currentPath === r.route_path ? "bg-slate-800" : "hover:bg-slate-800/50"
        } transition cursor-pointer">${escapeHtml(r.page_name)}</a>`
    )
    .join("\n");

  return `
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="javascript:void(0)" onclick="navigate('%2F')" class="font-bold text-xl cursor-pointer text-white">
        ${escapeHtml(input.appName)}
      </a>
      <div class="flex items-center gap-2">${links}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default nav when no Navigation.tsx is generated
// ─────────────────────────────────────────────────────────────────────────────

function renderDefaultNav(input: PreviewInput, currentPath: string): string {
  return input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) =>
        `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(r.route_path)}')" class="text-slate-300 text-sm hover:text-white cursor-pointer">${r.page_name}</a>`
    )
    .join(" | ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback when TSX conversion produces empty output
// ─────────────────────────────────────────────────────────────────────────────

function renderFallbackContent(input: PreviewInput): string {
  return `
    <div class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 class="text-5xl font-black mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
        ${escapeHtml(input.appName)}
      </h1>
      <p class="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
        ${escapeHtml(input.appDescription)}
      </p>
      <div class="flex gap-4 justify-center">
        <a href="javascript:void(0)" onclick="navigate('%2Fauth')" class="rounded-xl bg-orange-600 hover:bg-orange-500 px-8 py-4 font-semibold cursor-pointer">
          Get Started
        </a>
        <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')" class="rounded-xl border border-slate-700 hover:bg-slate-900 px-8 py-4 font-semibold cursor-pointer">
          Dashboard
        </a>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Not Found screen for unmatched routes
// ─────────────────────────────────────────────────────────────────────────────

function renderNotFoundContent(
  path: string,
  input: PreviewInput
): string {
  const route = input.routes.find((r) => r.route_path === path);
  const title = route ? route.page_name : "Page";
  const desc = route ? route.purpose : null;

  return `
    <div class="max-w-4xl mx-auto px-6 py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-6 mx-auto">📂</div>
      <h1 class="text-4xl font-bold mb-4">${escapeHtml(title)}</h1>
      <p class="text-slate-400 mb-8 max-w-lg mx-auto">
        ${escapeHtml(desc || `This is the ${title} page for ${input.appName}.`)}
      </p>
      <div class="inline-block bg-slate-900 border border-slate-800 rounded-xl p-6 font-mono text-xs text-left text-slate-400">
        <p class="text-orange-400 font-bold mb-2">// Route Information</p>
        <p>Path: <span class="text-white">${escapeHtml(path)}</span></p>
        <p>File: <span class="text-white">app${escapeHtml(path)}/page.tsx</span></p>
        <p>Status: <span class="text-emerald-400">Generated ✓</span></p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW V1 FALLBACK: Planning-based preview (no generated files yet)
// ─────────────────────────────────────────────────────────────────────────────

function renderFromPlanningData(
  input: PreviewInput,
  currentPath: string
): string {
  const navLinks = input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) =>
        `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(r.route_path)}')" class="px-3 py-2 rounded-lg text-sm font-medium ${
          currentPath === r.route_path
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
        } transition cursor-pointer">${escapeHtml(r.page_name)}</a>`
    )
    .join("\n");

  const header = `
    <nav class="border-b border-slate-800 bg-slate-900 px-6 py-4 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <a href="javascript:void(0)" onclick="navigate('%2F')" class="text-xl font-bold text-white flex items-center gap-2 cursor-pointer">
          <span class="text-orange-500">⚡</span> ${escapeHtml(input.appName)}
        </a>
        <div class="flex items-center gap-2">${navLinks}</div>
      </div>
    </nav>
  `;

  let body = "";
  switch (currentPath) {
    case "/": body = renderV1Home(input); break;
    case "/auth": case "/login": case "/signup": return renderV1Auth(input);
    case "/dashboard": body = renderV1Dashboard(input); break;
    case "/settings": body = renderV1Settings(input); break;
    default: body = renderNotFoundContent(currentPath, input); break;
  }

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(input.appName)} — Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>function navigate(p){window.location.href='?path='+p;}</script>
</head>
<body class="bg-slate-950 text-white min-h-full flex flex-col font-sans antialiased">
  ${header}
  <div class="flex-1">${body}</div>
  <footer class="border-t border-slate-800 py-8 text-center text-slate-500 text-xs">
    <p>${escapeHtml(input.appName)} — Generated by App Builder Studio · S2KDOTZA Entertainment</p>
  </footer>
</body>
</html>`;
}

function renderV1Home(input: PreviewInput): string {
  const cards = input.features.slice(0, 6).map((f) => `
    <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition">
      <div class="w-10 h-10 rounded-lg bg-orange-600/20 text-orange-400 mb-4 flex items-center justify-center font-bold">✓</div>
      <h3 class="font-bold text-white mb-2">${escapeHtml(f.feature_name)}</h3>
      <p class="text-slate-400 text-sm">Ready for implementation.</p>
    </div>`).join("");

  return `
    <section class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 class="text-6xl font-extrabold mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">${escapeHtml(input.appName)}</h1>
      <p class="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">${escapeHtml(input.appDescription)}</p>
      <div class="flex gap-4 justify-center">
        <a href="javascript:void(0)" onclick="navigate('%2Fauth')" class="rounded-xl bg-orange-600 hover:bg-orange-500 px-8 py-4 font-semibold cursor-pointer">Get Started Free</a>
        <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')" class="rounded-xl border border-slate-700 hover:bg-slate-900 px-8 py-4 font-semibold cursor-pointer">View Dashboard</a>
      </div>
    </section>
    <section class="max-w-5xl mx-auto px-6 py-12 border-t border-slate-900">
      <h2 class="text-3xl font-bold mb-8 text-center">Features</h2>
      <div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3">${cards}</div>
    </section>`;
}

function renderV1Auth(input: PreviewInput): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>function navigate(p){window.location.href='?path='+p;}</script>
</head>
<body class="bg-slate-950 text-white flex items-center justify-center min-h-full p-6 font-sans">
  <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
    <div class="text-center mb-6">
      <a href="javascript:void(0)" onclick="navigate('%2F')" class="text-xs text-orange-500 cursor-pointer">&larr; Home</a>
      <h1 class="text-3xl font-bold mt-4">${escapeHtml(input.appName)}</h1>
      <p class="text-slate-400 text-sm mt-2">Sign in to continue</p>
    </div>
    <div class="space-y-4">
      <input type="email" placeholder="Email address" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" />
      <input type="password" placeholder="Password" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" />
      <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')" class="block w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-xl text-sm font-semibold text-center cursor-pointer transition">Sign In</a>
    </div>
    <div class="my-5 flex items-center gap-4"><div class="flex-1 h-px bg-slate-800"></div><span class="text-xs text-slate-500">or</span><div class="flex-1 h-px bg-slate-800"></div></div>
    <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')" class="block w-full border border-slate-800 hover:bg-slate-800/40 py-3 rounded-xl text-sm font-semibold text-center cursor-pointer transition">Continue with Google</a>
  </div>
</body>
</html>`;
}

function renderV1Dashboard(input: PreviewInput): string {
  const rows = input.databaseTables.map((t) => `
    <tr class="border-b border-slate-800 hover:bg-slate-900/30">
      <td class="px-6 py-4 font-mono text-sm text-emerald-400">${escapeHtml(t.table_name)}</td>
      <td class="px-6 py-4 text-sm text-slate-300">${escapeHtml(t.purpose || "Stores data")}</td>
      <td class="px-6 py-4 text-xs text-emerald-400">● Active</td>
    </tr>`).join("");

  return `
    <div class="max-w-6xl mx-auto px-6 py-10">
      <div class="flex justify-between items-center mb-8">
        <div><h1 class="text-3xl font-bold">Dashboard</h1><p class="text-slate-400 text-sm mt-1">${escapeHtml(input.appName)}</p></div>
        <a href="javascript:void(0)" onclick="navigate('%2Fsettings')" class="border border-slate-800 px-4 py-2 rounded-lg text-sm hover:bg-slate-800 cursor-pointer">⚙️ Settings</a>
      </div>
      <div class="grid gap-4 md:grid-cols-3 mb-8">
        <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl"><p class="text-xs text-slate-500 uppercase font-semibold">Pages</p><p class="text-3xl font-bold mt-2">${input.routes.length}</p></div>
        <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl"><p class="text-xs text-slate-500 uppercase font-semibold">Features</p><p class="text-3xl font-bold mt-2">${input.features.length}</p></div>
        <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl"><p class="text-xs text-slate-500 uppercase font-semibold">DB Tables</p><p class="text-3xl font-bold mt-2">${input.databaseTables.length}</p></div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div class="p-5 border-b border-slate-800 bg-slate-950"><h3 class="font-bold text-lg">Database</h3></div>
        <table class="w-full text-left"><thead><tr class="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-xs uppercase"><th class="px-6 py-3">Table</th><th class="px-6 py-3">Purpose</th><th class="px-6 py-3">Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">No tables yet</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

function renderV1Settings(input: PreviewInput): string {
  return `
    <div class="max-w-3xl mx-auto px-6 py-10">
      <h1 class="text-3xl font-bold mb-2">Settings</h1>
      <p class="text-slate-400 mb-8">${escapeHtml(input.appName)} configuration</p>
      <div class="space-y-6">
        <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <h3 class="font-bold text-lg mb-4 text-orange-400">General</h3>
          <div class="space-y-4">
            <div><label class="block text-xs text-slate-400 uppercase font-semibold">App Name</label><input readonly value="${escapeHtml(input.appName)}" class="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400" /></div>
            <div><label class="block text-xs text-slate-400 uppercase font-semibold">Description</label><textarea readonly class="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 resize-none" rows="2">${escapeHtml(input.appDescription)}</textarea></div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}