interface PreviewInput {
  appName: string;
  appDescription: string;
  routes: Array<{ page_name: string; route_path: string; purpose: string | null }>;
  features: Array<{ feature_name: string; priority: string | null }>;
  databaseTables: Array<{ table_name: string; purpose: string | null }>;
}

interface GeneratedFile {
  file_path: string;
  content: string;
  language: string;
}

export function generatePreviewHTML(
  input: PreviewInput,
  currentPath: string = "/",
  generatedFiles: GeneratedFile[] = []
): string {
  const path = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  if (generatedFiles.length > 0) {
    return renderWithFiles(input, path, generatedFiles);
  }
  return renderFallback(input, path);
}

function renderWithFiles(
  input: PreviewInput,
  currentPath: string,
  files: GeneratedFile[]
): string {
  const navLinks = buildNavLinks(input.routes, currentPath, files);
  const navScript = buildNavScript();

  // 1. Locate the page file for the current route
  let pageFile: GeneratedFile | undefined;
  if (currentPath === "/" || currentPath === "") {
    pageFile = files.find((f) => f.file_path.toLowerCase() === "app/page.tsx");
  } else {
    const routeName = currentPath.replace(/^\//, "").replace(/\/page\.tsx$/i, "");
    const cleanRouteName = routeName.replace(/\//g, "-");
    pageFile =
      files.find((f) => f.file_path.toLowerCase() === `app/${routeName}/page.tsx`) ||
      files.find((f) => f.file_path.toLowerCase() === `app/${cleanRouteName}/page.tsx`);
  }

  // 2. Check for special builtin routes if no custom generated page file exists
  if (!pageFile) {
    if (currentPath === "/auth" || currentPath === "/login" || currentPath === "/signup") {
      return buildAuthPage(input, navScript);
    }
    if (currentPath === "/dashboard") {
      return buildPage(input, navLinks, navScript, buildDashboard(input), "Dashboard", true);
    }
    if (currentPath === "/settings") {
      return buildPage(input, navLinks, navScript, buildSettings(input), "Settings", true);
    }
    return buildPage(input, navLinks, navScript, buildGenericRoute(currentPath, input), currentPath, true);
  }

  // 3. Convert page TSX content to renderable HTML (expanding all components recursively)
  const renderedPage = tsxToRenderable(pageFile.content, input, files);

  // 4. Locate and convert app/layout.tsx if it exists
  const layoutFile = files.find((f) => f.file_path.toLowerCase() === "app/layout.tsx");
  let combinedContent = renderedPage;

  if (layoutFile) {
    let renderedLayout = tsxToRenderable(layoutFile.content, input, files);

    if (renderedLayout.includes("{children}")) {
      combinedContent = renderedLayout.replace(/\{children\}/g, renderedPage);
    } else if (renderedLayout.toLowerCase().includes("<body") && renderedLayout.toLowerCase().includes("</body>")) {
      combinedContent = renderedLayout.replace(/<\/body>/i, `${renderedPage}</body>`);
    } else {
      combinedContent = `${renderedLayout}\n${renderedPage}`;
    }
  }

  // 5. Check if combined rendered output already contains its own <nav> or <header> bar
  const hasOwnNav = /<(nav|header)\b[^>]*>/i.test(combinedContent);

  return buildPage(input, navLinks, navScript, combinedContent, input.appName, !hasOwnNav);
}

// Extract only the clean returned JSX/SVG body from any component or page file
function extractComponentBody(code: string): string {
  if (!code || !code.trim()) return "";
  let clean = code;

  // 1. Remove all import statements at the top
  clean = clean.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "");

  // 2. Try to match the returned JSX inside a return (...) block first
  const returnMatch = clean.match(/return\s*\(\s*([<][\s\S]*?)\s*\)\s*;?\s*(?:\}|\n|$)/i);
  if (returnMatch && returnMatch[1]) {
    return returnMatch[1].trim();
  }

  // 3. Try matching direct arrow return without parentheses: const Comp = () => (<svg...>) or const Comp = () => <div...>
  const arrowMatch = clean.match(/(?:const|let|var)\s+\w+\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*([<][\s\S]*?)\s*;?\s*(?:export\s+default|$)/i);
  if (arrowMatch && arrowMatch[1]) {
    return arrowMatch[1].trim();
  }

  // 4. Strip out outer function / const / export statements cleanly
  clean = clean.replace(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/g, "");
  clean = clean.replace(/export\s+const\s+metadata[\s\S]*?=\s*\{[\s\S]*?\};?/g, "");
  clean = clean.replace(/(?:export\s+default\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\{?/g, "");
  clean = clean.replace(/export\s+default\s+\w+\s*;?/g, "");
  clean = clean.replace(/["']use client["'];?\s*/g, "");
  clean = clean.replace(/^\s*return\s*\(\s*$/gm, "");
  clean = clean.replace(/^\s*\);\s*$/gm, "");
  clean = clean.replace(/^\}\s*;?\s*$/gm, "");

  return clean.trim();
}

// Recursively expand component tags (<Navigation />, <Logo />, <Footer />, etc.) from files
function expandComponents(
  tsx: string,
  files: GeneratedFile[],
  input: PreviewInput,
  depth: number = 0
): string {
  if (depth > 6) return tsx;

  let result = tsx;
  const componentFiles = files.filter(
    (f) =>
      f.file_path.toLowerCase().includes("components/") &&
      (f.file_path.endsWith(".tsx") || f.file_path.endsWith(".jsx"))
  );

  for (const comp of componentFiles) {
    const compName = comp.file_path.split("/").pop()?.replace(/\.(tsx|jsx)$/i, "");
    if (!compName) continue;

    const selfClosingRegex = new RegExp(`<${compName}\\s*([^>]*?)\\/>`, "gi");
    const openCloseRegex = new RegExp(`<${compName}\\s*([^>]*?)>([\\s\\S]*?)<\\/${compName}>`, "gi");

    if (selfClosingRegex.test(result) || openCloseRegex.test(result)) {
      const rawCompBody = extractComponentBody(comp.content);
      const expandedCompContent = expandComponents(rawCompBody, files, input, depth + 1);
      const compHtml = tsxToRenderableCore(expandedCompContent);

      result = result.replace(selfClosingRegex, compHtml);
      result = result.replace(openCloseRegex, compHtml);
    }
  }

  return result;
}

function tsxToRenderable(tsx: string, input: PreviewInput, files: GeneratedFile[] = []): string {
  const bodyOnly = extractComponentBody(tsx);
  const expanded = files.length > 0 ? expandComponents(bodyOnly, files, input) : bodyOnly;
  return tsxToRenderableCore(expanded);
}

function tsxToRenderableCore(tsx: string): string {
  let html = tsx;

  html = html.replace(/\{\s*children\s*\}/g, "___CHILDREN_PLACEHOLDER___");
  html = html.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "");
  html = html.replace(/export\s+default\s+\w+\s*;?/g, "");
  html = html.replace(/["']use client["'];?\s*/g, "");
  html = html.replace(/^\}\s*;?\s*$/gm, "");

  html = html.replace(/className=/g, "class=");
  html = html.replace(/viewBox=/g, "viewBox=");
  html = html.replace(/strokeWidth=/g, "stroke-width=");
  html = html.replace(/stopColor=/g, "stop-color=");
  html = html.replace(/fillOpacity=/g, "fill-opacity=");

  html = html.replace(
    /<Link\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Link>/gi,
    (_, href, children) =>
      `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(href)}')" style="cursor:pointer">${children}</a>`
  );

  html = html.replace(
    /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (match, href, children) => {
      if (match.toLowerCase().includes("onclick")) return match;
      return `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(href)}')" style="cursor:pointer">${children}</a>`;
    }
  );

  html = html.replace(
    /<Image\s+src=["']([^"']+)["'][^/]*(\/?)>/gi,
    (_, src) => `<img src="${src}" style="max-width:100%;height:auto" />`
  );

  html = html.replace(/<>\s*|\s*<\/>/g, "");
  html = html.replace(/\{"\s*"\}/g, " ");
  html = html.replace(/\{'\s*'\}/g, " ");
  html = html.replace(/\{`([^`]*)`\}/g, "$1");
  html = html.replace(/\{[^{}]*\}/g, "");
  html = html.replace(/___CHILDREN_PLACEHOLDER___/g, "{children}");

  html = html.replace(/<(\w+)([^>]*?)\/>/g, (match, tag, attrs) => {
    const voidTags = ["img", "input", "br", "hr", "meta", "link", "path", "circle", "rect", "line", "polygon", "stop"];
    if (voidTags.includes(tag.toLowerCase())) {
      return `<${tag}${attrs} />`;
    }
    return `<${tag}${attrs}></${tag}>`;
  });

  html = html.replace(/\n{3,}/g, "\n\n");
  return html.trim();
}

function buildPage(
  input: PreviewInput,
  navLinks: string,
  navScript: string,
  body: string,
  title: string,
  includeTopNav: boolean = true
): string {
  const navHtml = includeTopNav
    ? `
  <!-- Navigation Bar -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 sticky top-0 z-50 shrink-0">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="javascript:void(0)" onclick="navigate('%2F')" class="text-xl font-bold text-white flex items-center gap-2">
        <span class="text-orange-500">⚡</span> ${escapeHtml(input.appName)}
      </a>
      <nav class="flex items-center gap-2 flex-wrap">${navLinks}</nav>
    </div>
  </header>`
    : "";

  // Notice: body is wrapped inside a flex-1 min-h-screen container ensuring 100% height across ALL viewports!
  return `<!DOCTYPE html>
<html lang="en" style="height:100%;width:100%;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — ${escapeHtml(input.appName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${navScript}
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; min-height: 100vh; height: 100%; width: 100%; background: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { display: flex; flex-direction: column; overflow-x: hidden; }
    .preview-content-wrapper { flex: 1; display: flex; flex-direction: column; min-height: 100%; width: 100%; }
  </style>
</head>
<body>
  ${navHtml}
  <!-- Page Content inside Full-Height Flex Wrapper -->
  <div class="preview-content-wrapper">
    ${body}
  </div>
  <!-- Preview Badge -->
  <div style="position:fixed;bottom:12px;right:12px;background:#ea580c;color:white;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.4);pointer-events:none;">
    Live Code Preview
  </div>
</body>
</html>`;
}

function buildNavLinks(
  routes: Array<{ page_name: string; route_path: string }>,
  currentPath: string,
  files: GeneratedFile[] = []
): string {
  const routeMap = new Map<string, string>();

  for (const r of routes) {
    if (r.route_path !== "/") {
      routeMap.set(r.route_path.toLowerCase(), r.page_name);
    }
  }

  for (const f of files) {
    if (f.file_path.toLowerCase().startsWith("app/") && f.file_path.toLowerCase().endsWith("/page.tsx")) {
      if (f.file_path.toLowerCase() !== "app/page.tsx") {
        const cleanPath = "/" + f.file_path.slice(4, -9);
        if (!routeMap.has(cleanPath.toLowerCase())) {
          const formattedName = cleanPath
            .replace(/^\//, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          routeMap.set(cleanPath.toLowerCase(), formattedName || "Page");
        }
      }
    }
  }

  const mergedRoutes = Array.from(routeMap.entries()).map(([route_path, page_name]) => ({
    route_path,
    page_name,
  }));

  return mergedRoutes
    .slice(0, 8)
    .map(
      (r) =>
        `<a href="javascript:void(0)" onclick="navigate('${encodeURIComponent(r.route_path)}')"
           class="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition
           ${currentPath.toLowerCase() === r.route_path.toLowerCase() ? "bg-slate-800 text-white font-bold border border-slate-700" : "text-slate-300 hover:text-white hover:bg-slate-800/50"}">
          ${escapeHtml(r.page_name)}
        </a>`
    )
    .join("\n");
}

function buildNavScript(): string {
  return `<script>
    function navigate(path) {
      window.location.href = '?path=' + path;
    }
  </script>`;
}

function buildAuthPage(input: PreviewInput, navScript: string): string {
  return `<!DOCTYPE html>
<html lang="en" style="height:100%;width:100%;">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  ${navScript}
</head>
<body class="bg-slate-950 text-white min-h-screen w-full flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
    <div class="text-center mb-6">
      <a href="javascript:void(0)" onclick="navigate('%2F')" class="text-xs text-orange-500">← Home</a>
      <h1 class="text-3xl font-bold mt-4">${escapeHtml(input.appName)}</h1>
      <p class="text-slate-400 text-sm mt-2">Sign in to continue</p>
    </div>
    <div class="space-y-4">
      <input type="email" placeholder="Email address"
        class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 text-white" />
      <input type="password" placeholder="Password"
        class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 text-white" />
      <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')"
        class="block w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-xl text-sm font-bold text-center text-white transition">
        Sign In
      </a>
    </div>
    <div class="my-5 flex items-center gap-4">
      <div class="flex-1 h-px bg-slate-800"></div>
      <span class="text-xs text-slate-500">or</span>
      <div class="flex-1 h-px bg-slate-800"></div>
    </div>
    <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')"
      class="block w-full border border-slate-800 hover:bg-slate-800/40 py-3 rounded-xl text-sm font-bold text-center text-white transition">
      Continue with Google
    </a>
  </div>
</body>
</html>`;
}

function buildDashboard(input: PreviewInput): string {
  return `
    <div class="bg-slate-950 text-white min-h-screen w-full flex-1 flex flex-col">
      <div class="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-white">Dashboard</h1>
            <p class="text-slate-400 text-sm mt-1">${escapeHtml(input.appName)}</p>
          </div>
          <a href="javascript:void(0)" onclick="navigate('%2Fsettings')"
            class="border border-slate-700 px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 cursor-pointer">
            ⚙️ Settings
          </a>
        </div>
        <div class="grid gap-4 md:grid-cols-3 mb-8">
          <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <p class="text-xs text-slate-500 uppercase font-semibold">Pages</p>
            <p class="text-3xl font-bold mt-2 text-white">${input.routes.length}</p>
          </div>
          <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <p class="text-xs text-slate-500 uppercase font-semibold">Features</p>
            <p class="text-3xl font-bold mt-2 text-white">${input.features.length}</p>
          </div>
          <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <p class="text-xs text-slate-500 uppercase font-semibold">Tables</p>
            <p class="text-3xl font-bold mt-2 text-white">${input.databaseTables.length}</p>
          </div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div class="p-5 border-b border-slate-800 bg-slate-950">
            <h3 class="font-bold text-white text-lg">Activity</h3>
          </div>
          <div class="p-6 text-slate-400 text-sm">No recent activity recorded for this workspace session.</div>
        </div>
      </div>
    </div>
  `;
}

function buildSettings(input: PreviewInput): string {
  return `
    <div class="bg-slate-950 text-white min-h-screen w-full flex-1 flex flex-col">
      <div class="max-w-3xl mx-auto px-6 py-10 flex-1 w-full">
        <h1 class="text-3xl font-bold mb-2 text-white">Settings</h1>
        <p class="text-slate-400 mb-8">${escapeHtml(input.appName)} configuration</p>
        <div class="space-y-5">
          <div class="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 class="font-bold text-lg mb-4 text-orange-400">General</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-400 uppercase font-semibold mb-1">App Name</label>
                <input readonly value="${escapeHtml(input.appName)}"
                  class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildGenericRoute(path: string, input: PreviewInput): string {
  const route = input.routes.find((r) => r.route_path === path);
  const title = route?.page_name || path.replace(/^\//, "").replace(/-/g, " ") || "Page";
  return `
    <div class="bg-slate-950 text-white min-h-screen w-full flex-1 flex flex-col items-center justify-center text-center px-6">
      <div class="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-6">📂</div>
      <h1 class="text-4xl font-bold mb-4 text-white">${escapeHtml(title.charAt(0).toUpperCase() + title.slice(1))}</h1>
      <p class="text-slate-400 mb-8 max-w-md">${escapeHtml(route?.purpose || `This is the ${title} page.`)}</p>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs text-left text-slate-400">
        <p class="text-orange-400 font-bold mb-2">// Route</p>
        <p>Path: <span class="text-white">${escapeHtml(path)}</span></p>
        <p>File: <span class="text-white">app${escapeHtml(path)}/page.tsx</span></p>
        <p>Status: <span class="text-emerald-400">Generated ✓</span></p>
      </div>
    </div>
  `;
}

function renderFallback(input: PreviewInput, currentPath: string): string {
  const navLinks = buildNavLinks(input.routes, currentPath, []);
  const navScript = buildNavScript();
  if (currentPath === "/auth" || currentPath === "/login") {
    return buildAuthPage(input, navScript);
  }
  let body = "";
  switch (currentPath) {
    case "/":
      body = `
        <div class="bg-slate-950 text-white min-h-screen w-full flex-1 flex flex-col justify-center">
          <section class="max-w-5xl mx-auto px-6 py-20 text-center w-full">
            <h1 class="text-6xl font-extrabold mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              ${escapeHtml(input.appName)}
            </h1>
            <p class="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">${escapeHtml(input.appDescription)}</p>
            <div class="flex gap-4 justify-center">
              <a href="javascript:void(0)" onclick="navigate('%2Fauth')"
                class="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold cursor-pointer transition">Get Started</a>
              <a href="javascript:void(0)" onclick="navigate('%2Fdashboard')"
                class="border border-slate-700 hover:bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold cursor-pointer transition">Dashboard</a>
            </div>
          </section>
          ${
            input.features.length > 0
              ? `
          <section class="max-w-5xl mx-auto px-6 py-12 border-t border-slate-900 w-full">
            <div class="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
              ${input.features
                .slice(0, 6)
                .map(
                  (f) => `
                <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <h3 class="font-bold text-white mb-1">${escapeHtml(f.feature_name)}</h3>
                </div>`
                )
                .join("")}
            </div>
          </section> `
              : ""
          }
        </div>`;
      break;
    case "/dashboard":
      body = buildDashboard(input);
      break;
    case "/settings":
      body = buildSettings(input);
      break;
    default:
      body = buildGenericRoute(currentPath, input);
  }
  return buildPage(input, navLinks, navScript, body, input.appName);
}

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}