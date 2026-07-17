import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Navigation */}
      <nav className="border-b border-stone-800 bg-stone-900/90 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center">
              <span className="text-stone-950 font-black text-sm">S</span>
            </div>
            <div>
              <p className="font-bold text-stone-100 leading-none text-sm">App Builder Studio</p>
              <p className="text-xs text-stone-500 leading-none mt-0.5">by S2KDOTZA Entertainment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm text-stone-400 hover:text-stone-100 transition">Sign In</Link>
            <Link href="/auth" className="rounded-xl bg-orange-700 hover:bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition">
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-900/20 px-4 py-1.5 text-xs font-bold text-orange-400 mb-10 tracking-wider uppercase">
          S2KDOTZA Entertainment · App Builder Studio
        </div>
        <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight tracking-tight text-stone-100">
          Build Powerful Apps
          <br />
          <span className="text-orange-500">From Simple Ideas</span>
        </h1>
        <p className="text-lg text-stone-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Describe your idea. Shang Tsung structures it, generates real code,
          and lets you edit with AI — all in one workspace.
          No coding experience required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth" className="rounded-2xl bg-orange-700 hover:bg-orange-600 px-10 py-4 text-lg font-black text-white transition shadow-2xl shadow-orange-900/40">
            Start Building Free →
          </Link>
          <Link href="/auth" className="rounded-2xl border border-stone-700 hover:bg-stone-900 px-10 py-4 text-lg font-semibold transition">
            See a Demo
          </Link>
        </div>
        <p className="mt-6 text-xs text-stone-600">No credit card required · Built in South Africa 🇿🇦</p>
      </section>

      {/* Two Stage */}
      <section className="border-t border-stone-800 bg-stone-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 text-stone-100">Two Stages. One Platform.</h2>
            <p className="text-stone-400 max-w-2xl mx-auto">From raw idea to downloadable code — structured, disciplined, fast.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-700 bg-stone-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-stone-700 border border-stone-600 text-orange-400 flex items-center justify-center font-black">1</div>
                <div>
                  <p className="font-black text-stone-100 text-lg">Planning Stage</p>
                  <p className="text-xs text-stone-500">Architecture & Strategy</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-stone-300">
                {["Brain Dump — describe idea in plain language","AI generates complete app architecture","Define routes, features, and database","Edit every item manually or with AI","Generate a complete Game Plan","Shang Tsung assists planning"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-800/40 bg-stone-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-900/30 border border-orange-800/40 text-orange-400 flex items-center justify-center font-black">2</div>
                <div>
                  <p className="font-black text-stone-100 text-lg">The Forge</p>
                  <p className="text-xs text-stone-500">Code Generation & Preview</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-stone-300">
                {["Generate real Next.js + Tailwind code files","Browse every generated file","Live interactive app preview","Navigate preview like a real app","Shang Tsung edits code with AI commands","Download complete project as ZIP"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5 shrink-0">⚡</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Shang Tsung Feature */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-800/50 bg-orange-900/20 px-4 py-1.5 text-xs font-bold text-orange-400 mb-6 tracking-wider uppercase">
                🥋 Meet Shang Tsung
              </div>
              <h2 className="text-4xl font-black mb-4 text-stone-100">
                Your AI Dojo Master.
                <br />
                <span className="text-orange-500">Always Inside The Forge.</span>
              </h2>
              <p className="text-stone-400 mb-6 leading-relaxed">
                Tell Shang Tsung what to change in plain language.
                He modifies the actual code instantly.
              </p>
              <ul className="space-y-2 text-sm text-stone-400">
                {['"Change the hero color to orange"','"Make the button green"','"Add a pricing section"','"Make the heading larger"','"Add a testimonials section"'].map((cmd) => (
                  <li key={cmd} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <code className="text-orange-300 font-mono">{cmd}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden">
              <div className="border-b border-stone-700 bg-stone-800 px-4 py-3 flex items-center gap-2">
                <span className="text-orange-400 font-bold text-sm">🥋 Shang Tsung</span>
                <span className="text-xs text-stone-500">Code Editor</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-orange-900/30 border border-orange-800/40 rounded-xl p-3 text-sm text-orange-200">Change the hero color to orange</div>
                <div className="bg-stone-800 rounded-xl p-3 text-sm text-stone-300">Done. The hero title is now orange. Preview refreshed automatically. ✅</div>
                <div className="bg-orange-900/30 border border-orange-800/40 rounded-xl p-3 text-sm text-orange-200">Add a pricing section</div>
                <div className="bg-stone-800 rounded-xl p-3 text-sm text-stone-300">Done. A 3-tier pricing section added to homepage. ✅</div>
              </div>
              <div className="border-t border-stone-700 p-3 bg-stone-950">
                <div className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-500">Tell Shang Tsung what to change...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-stone-800 bg-stone-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 text-stone-100">Everything You Need to Ship</h2>
            <p className="text-stone-400">From idea to downloadable project — no coding experience required.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {[
              { icon: "🧠", title: "Brain Dump", desc: "Describe your idea raw and messy. Shang Tsung structures it into a complete architecture instantly." },
              { icon: "⚡", title: "Real Code Generation", desc: "Generate actual Next.js + Tailwind code files from your approved plan." },
              { icon: "👁", title: "Live App Preview", desc: "See your app render in real time. Navigate between pages just like a real browser." },
              { icon: "🥋", title: "Shang Tsung AI Editor", desc: "Tell the AI what to change. It modifies code and refreshes the preview automatically." },
              { icon: "📦", title: "Download as ZIP", desc: "Download your complete project. Run npm install and your app works immediately." },
              { icon: "🔒", title: "Your Code. Your Rules.", desc: "Every project belongs to you. Download it, host it, sell it. No lock-in. Ever." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-700 bg-stone-800 p-6 hover:border-orange-800/50 transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-black text-stone-100 text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 text-stone-100">Simple Pricing</h2>
            <p className="text-stone-400">Start free. Scale when ready.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { name: "Free", price: "$0", period: "forever", border: "border-stone-700", badge: null, cta: "Get Started Free", ctaStyle: "border border-stone-600 hover:bg-stone-800 text-stone-100", features: ["3 app projects","Planning stage","Game Plan export","Basic code generation"] },
              { name: "Pro", price: "$19", period: "per month", border: "border-orange-700/60", badge: "Most Popular", cta: "Start Pro", ctaStyle: "bg-orange-700 hover:bg-orange-600 text-white", features: ["Unlimited projects","Full Forge access","Real AI generation","Shang Tsung editor","ZIP download"] },
              { name: "Business", price: "$49", period: "per month", border: "border-stone-700", badge: null, cta: "Start Business", ctaStyle: "border border-stone-600 hover:bg-stone-800 text-stone-100", features: ["Everything in Pro","Team access","White label","Admin dashboard","Priority support"] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl border ${plan.border} bg-stone-800 p-8 relative`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-700 text-white px-4 py-1 text-xs font-black">{plan.badge}</div>
                )}
                <h3 className="font-black text-xl text-stone-100 mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black text-stone-100">{plan.price}</span>
                  <span className="text-stone-400 text-sm mb-1">/{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-stone-300">
                      <span className="text-orange-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth" className={`block w-full rounded-xl py-3 text-sm font-bold text-center transition ${plan.ctaStyle}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800 bg-stone-900 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black mb-6 text-stone-100">Ready to Build?</h2>
          <p className="text-xl text-stone-400 mb-10 max-w-2xl mx-auto">Your ideas deserve to exist. Stop waiting and start building.</p>
          <Link href="/auth" className="inline-block rounded-2xl bg-orange-700 hover:bg-orange-600 px-12 py-5 text-xl font-black text-white transition shadow-2xl shadow-orange-900/40">
            Start Building Free →
          </Link>
          <p className="mt-4 text-xs text-stone-600">Built by S2KDOTZA Entertainment 🇿🇦</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange-700 flex items-center justify-center">
              <span className="text-white font-black text-xs">S</span>
            </div>
            <div>
              <p className="font-bold text-sm text-stone-100">App Builder Studio</p>
              <p className="text-xs text-stone-500">by S2KDOTZA Entertainment</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-stone-500">
            <Link href="/auth" className="hover:text-stone-100 transition">Sign In</Link>
            <Link href="/terms" className="hover:text-stone-100 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-stone-100 transition">Privacy</Link>
          </div>
          <p className="text-xs text-stone-600">© {new Date().getFullYear()} S2KDOTZA Entertainment</p>
        </div>
      </footer>
    </main>
  );
}