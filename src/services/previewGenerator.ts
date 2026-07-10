// Converts project data into self-contained HTML for live preview.
// Uses Tailwind via CDN so the iframe renders instantly without a build step.

interface PreviewInput {
  appName: string;
  appDescription: string;
  routes: Array<{ page_name: string; route_path: string; purpose: string | null }>;
  features: Array<{ feature_name: string; priority: string | null }>;
}

export function generatePreviewHTML(input: PreviewInput): string {
  const navLinks = input.routes
    .filter((r) => r.route_path !== "/")
    .slice(0, 5)
    .map(
      (r) =>
        `<a href="#" class="text-slate-300 hover:text-white transition text-sm">${escapeHtml(
          r.page_name
        )}</a>`
    )
    .join("\n");

  const featureCards = input.features
    .slice(0, 6)
    .map(
      (f) => `
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 mb-4 flex items-center justify-center text-xl">⚡</div>
        <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(f.feature_name)}</h3>
        <p class="text-slate-400 text-sm">Powered by ${escapeHtml(input.appName)}.</p>
      </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(input.appName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white">

  <!-- Navigation -->
  <nav class="border-b border-slate-800 bg-slate-900 px-6 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-white">${escapeHtml(input.appName)}</span>
      <div class="flex items-center gap-6">
        ${navLinks}
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="max-w-5xl mx-auto px-6 py-20 text-center">
    <h1 class="text-5xl font-bold mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
      ${escapeHtml(input.appName)}
    </h1>
    <p class="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
      ${escapeHtml(input.appDescription)}
    </p>
    <div class="flex gap-4 justify-center">
      <button class="rounded-xl bg-orange-600 hover:bg-orange-500 px-8 py-4 font-semibold transition">
        Get Started
      </button>
      <button class="rounded-xl border border-slate-700 hover:bg-slate-800 px-8 py-4 font-semibold transition">
        Learn More
      </button>
    </div>
  </section>

  <!-- Features -->
  <section class="max-w-5xl mx-auto px-6 py-16">
    <h2 class="text-3xl font-bold mb-10 text-center">Features</h2>
    <div class="grid gap-6 md:grid-cols-3">
      ${featureCards}
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800 mt-16 py-8 text-center text-slate-500 text-sm">
    <p>${escapeHtml(input.appName)} — Built with App Builder Studio by S2KDOTZA Entertainment.</p>
  </footer>

</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}