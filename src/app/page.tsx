import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-bold text-white leading-none">App Builder Studio</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">by S2KDOTZA Entertainment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm text-slate-400 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/auth"
              className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-sm font-semibold transition"
            >
              Start Building Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-800 bg-orange-950/40 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-8">
          <span>⚡</span>
          <span>Powered by S2KDOTZA Entertainment</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
          Build Powerful Apps
          <br />
          From Simple Ideas
        </h1>

        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Describe your app idea in plain language. App Builder Studio turns it into a
          complete architecture, generates real code, and lets you edit it with AI —
          all in one place. No coding experience required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth"
            className="rounded-2xl bg-orange-600 hover:bg-orange-500 px-10 py-4 text-lg font-bold transition shadow-2xl shadow-orange-600/20"
          >
            Start Building Free →
          </Link>
          <Link
            href="/auth"
            className="rounded-2xl border border-slate-700 hover:bg-slate-900 px-10 py-4 text-lg font-semibold transition"
          >
            See a Demo
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-600">
          No credit card required · Free plan available · Built in South Africa 🇿🇦
        </p>
      </section>

      {/* Two Stage Product Section */}
      <section className="border-t border-slate-900 bg-slate-900/30 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Two Stages. One Platform.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              App Builder Studio takes you from raw idea to downloadable project in two
              structured stages — no guesswork, no confusion.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Stage 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-lg">
                  1
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Planning Stage</p>
                  <p className="text-xs text-slate-500">Architecture & Strategy</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  "Describe your app idea in plain language",
                  "AI generates complete app architecture",
                  "Define routes, features, and database",
                  "Edit every item manually or with AI",
                  "Generate a complete Game Plan export",
                  "Shang Tsung assists your planning",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stage 2 */}
            <div className="rounded-2xl border border-orange-800/50 bg-gradient-to-b from-orange-950/20 to-slate-900 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-black text-lg">
                  2
                </div>
                <div>
                  <p className="font-bold text-white text-lg">The Forge</p>
                  <p className="text-xs text-slate-500">Code Generation & Preview</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  "Generate real Next.js + Tailwind code files",
                  "Browse every generated file",
                  "Live interactive app preview",
                  "Navigate preview like a real app",
                  "Shang Tsung edits code with AI commands",
                  "Download complete project as ZIP",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">⚡</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Shang Tsung Feature Section */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-800 bg-orange-950/40 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-6">
                🥋 Meet Shang Tsung
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Your AI Dojo Master.
                <br />
                <span className="text-orange-400">Always Inside The Forge.</span>
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Shang Tsung is your built-in AI code editor. Tell him what to change in
                plain language and he modifies the actual generated code instantly —
                no technical knowledge required.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  '"Change the hero color to orange"',
                  '"Make the button green"',
                  '"Add a pricing section"',
                  '"Make the heading larger"',
                  '"Change the background to dark"',
                  '"Add a dark mode toggle"',
                ].map((cmd) => (
                  <li key={cmd} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <code className="text-orange-300 font-mono">{cmd}</code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 flex items-center gap-2">
                <span className="text-orange-400 font-bold text-sm">🥋 Shang Tsung</span>
                <span className="text-xs text-slate-500">Code Editor</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-orange-900/30 border border-orange-800/50 rounded-xl p-3 text-sm text-orange-200">
                  Change the hero color to orange
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-sm text-slate-300">
                  Done. The hero title is now orange. Preview refreshed automatically. ✅
                </div>
                <div className="bg-orange-900/30 border border-orange-800/50 rounded-xl p-3 text-sm text-orange-200">
                  Add a pricing section to the homepage
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-sm text-slate-300">
                  Done. A 3-tier pricing section has been added to app/page.tsx. Preview refreshed. ✅
                </div>
              </div>
              <div className="border-t border-slate-800 p-3">
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500">
                  Tell Shang Tsung what to change...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-slate-900 bg-slate-900/30 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Ship</h2>
            <p className="text-slate-400">
              From idea to downloadable project — no coding experience required.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              { icon: "🧠", title: "AI-Powered Planning", desc: "Describe your idea and AI generates a complete app architecture including routes, features, and database." },
              { icon: "⚡", title: "Real Code Generation", desc: "Generate actual Next.js + Tailwind code files from your approved plan. Not templates — real, editable code." },
              { icon: "👁", title: "Live App Preview", desc: "See your app render in real time inside the Forge. Navigate between pages just like a real browser." },
              { icon: "🥋", title: "Shang Tsung AI Editor", desc: "Tell the AI what to change in plain English. It modifies the code and refreshes the preview automatically." },
              { icon: "📦", title: "Download as ZIP", desc: "Download your complete project as a ZIP file. Run npm install and your app works immediately." },
              { icon: "🔒", title: "Your Code. Your Rules.", desc: "Every project you build is yours. Download it, host it, sell it. No platform lock-in. Ever." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-slate-400">Start free. Scale when you're ready.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                color: "border-slate-800",
                badge: null,
                features: [
                  "3 app projects",
                  "Planning stage",
                  "Game Plan export",
                  "Basic code generation",
                  "Community support",
                ],
                cta: "Get Started Free",
                ctaStyle: "border border-slate-700 hover:bg-slate-900",
              },
              {
                name: "Pro",
                price: "$19",
                period: "per month",
                color: "border-orange-700",
                badge: "Most Popular",
                features: [
                  "Unlimited projects",
                  "Full Forge access",
                  "Real AI generation",
                  "Shang Tsung code editor",
                  "ZIP download",
                  "Priority support",
                ],
                cta: "Start Pro",
                ctaStyle: "bg-orange-600 hover:bg-orange-500",
              },
              {
                name: "Business",
                price: "$49",
                period: "per month",
                color: "border-slate-800",
                badge: null,
                features: [
                  "Everything in Pro",
                  "Team collaboration",
                  "White label exports",
                  "Admin dashboard",
                  "Custom AI prompts",
                  "Dedicated support",
                ],
                cta: "Start Business",
                ctaStyle: "border border-slate-700 hover:bg-slate-900",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border ${plan.color} bg-slate-900 p-8 relative`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-xs font-bold">
                    {plan.badge}
                  </div>
                )}
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-slate-400 text-sm mb-1">/{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  className={`block w-full rounded-xl py-3 text-sm font-semibold text-center transition ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-900 bg-gradient-to-b from-slate-900 to-slate-950 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Ready to Build Your App?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join founders, artists, and entrepreneurs who are building real software
            without needing a coding background.
          </p>
          <Link
            href="/auth"
            className="inline-block rounded-2xl bg-orange-600 hover:bg-orange-500 px-12 py-5 text-xl font-bold transition shadow-2xl shadow-orange-600/20"
          >
            Start Building Free →
          </Link>
          <p className="mt-4 text-xs text-slate-600">
            No credit card · Free plan · Built by S2KDOTZA Entertainment 🇿🇦
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-bold text-sm">App Builder Studio</p>
              <p className="text-xs text-slate-500">by S2KDOTZA Entertainment</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/auth" className="hover:text-white transition">Sign In</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} S2KDOTZA Entertainment. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}