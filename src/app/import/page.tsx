"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DetectedFile {
  file_path: string;
  content: string;
  language: string;
}

interface AnalysisResult {
  app_name: string;
  app_type: string;
  app_description: string;
  framework: string;
  detected_routes: Array<{ page_name: string; route_path: string; purpose: string }>;
  detected_features: Array<{ feature_name: string; priority: string }>;
  detected_tables: Array<{ table_name: string; purpose: string }>;
  files: DetectedFile[];
  file_count: number;
  warnings: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"upload" | "analyzing" | "review" | "creating">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [destination, setDestination] = useState<"planning" | "forge" | null>(null);

  async function handleFileUpload(file: File) {
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a ZIP file containing your project.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File is too large. Maximum size is 50MB.");
      return;
    }

    setError("");
    setStage("analyzing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAnalysis(data);
      setStage("review");
    } catch (e: any) {
      setError(e.message);
      setStage("upload");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleCreate(dest: "planning" | "forge") {
    if (!analysis) return;
    setDestination(dest);
    setCreating(true);
    setStage("creating");

    try {
      const res = await fetch("/api/import/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, destination: dest }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      if (dest === "planning") {
        router.push(`/builder/${data.projectId}/overview`);
      } else {
        router.push(`/builder/${data.projectId}/forge`);
      }
    } catch (e: any) {
      setError(e.message);
      setStage("review");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 bg-stone-900 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-100 transition">
          &larr; Dashboard
        </Link>
        <div className="h-5 w-px bg-stone-700" />
        <div>
          <h1 className="font-black text-stone-100">📥 Import Project</h1>
          <p className="text-xs text-stone-500">
            Upload existing code. Shang Tsung reads it and continues building.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* STAGE: UPLOAD */}
        {stage === "upload" && (
          <div>
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">📥</div>
              <h2 className="text-3xl font-black mb-2 text-stone-100">
                Import Your Existing Code
              </h2>
              <p className="text-stone-400 text-sm max-w-lg mx-auto leading-relaxed">
                Upload a ZIP file of your project. Shang Tsung will analyze the
                code, detect your routes, features, and database structure, then
                let you continue building from where you left off.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition ${
                dragOver
                  ? "border-orange-500 bg-orange-900/10"
                  : "border-stone-700 hover:border-stone-500 hover:bg-stone-900/50"
              }`}
            >
              <div className="text-5xl mb-4">📦</div>
              <p className="font-black text-stone-100 text-lg mb-2">
                Drop your ZIP file here
              </p>
              <p className="text-stone-500 text-sm mb-4">or click to browse</p>
              <div className="inline-flex items-center gap-2 rounded-xl bg-orange-700 hover:bg-orange-600 px-6 py-3 text-sm font-black text-white transition">
                Browse Files
              </div>
              <p className="text-xs text-stone-600 mt-4">
                ZIP files only · Maximum 50MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileInput}
            />

            {error && (
              <div className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* What's Supported */}
            <div className="mt-8 rounded-2xl border border-stone-700 bg-stone-900 p-6">
              <h3 className="font-black text-stone-100 mb-4">What Gets Detected</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-stone-400">
                {[
                  "✓ Next.js / React pages and routes",
                  "✓ TypeScript and JavaScript files",
                  "✓ Prisma database schema",
                  "✓ Components and utilities",
                  "✓ Package.json dependencies",
                  "✓ Tailwind CSS styling",
                  "✓ API routes",
                  "✓ Configuration files",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="text-orange-500 shrink-0">✓</span>
                    <span>{item.replace("✓ ", "")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE: ANALYZING */}
        {stage === "analyzing" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🥋</div>
            <h2 className="text-3xl font-black mb-3 text-stone-100">
              Shang Tsung is Reading Your Code
            </h2>
            <p className="text-stone-400 mb-8">
              Analyzing file structure, detecting routes, features, and database...
            </p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-orange-600 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* STAGE: REVIEW */}
        {stage === "review" && analysis && (
          <div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-3xl font-black mb-2 text-stone-100">
                Analysis Complete
              </h2>
              <p className="text-stone-400 text-sm">
                Shang Tsung read {analysis.file_count} files. Review what was detected.
              </p>
            </div>

            {/* Analysis Summary Card */}
            <div className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden mb-6">
              <div className="border-b border-stone-800 bg-stone-800 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-stone-100">
                      {analysis.app_name}
                    </h3>
                    <p className="text-stone-400 text-sm mt-1">
                      {analysis.app_description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-orange-800/50 bg-orange-900/20 text-orange-400 text-xs px-3 py-1 font-bold">
                      {analysis.app_type}
                    </span>
                    <p className="text-xs text-stone-500 mt-1">{analysis.framework}</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-4 text-xs text-stone-500">
                  <span>📄 {analysis.file_count} files</span>
                  <span>📋 {analysis.detected_routes.length} routes</span>
                  <span>⚡ {analysis.detected_features.length} features</span>
                  <span>🗄️ {analysis.detected_tables.length} tables</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 divide-x divide-stone-800">
                {/* Routes */}
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">
                    Detected Pages
                  </h4>
                  {analysis.detected_routes.length === 0 ? (
                    <p className="text-xs text-stone-600">No routes detected</p>
                  ) : (
                    <ul className="space-y-2">
                      {analysis.detected_routes.slice(0, 6).map((r, i) => (
                        <li key={i} className="text-sm">
                          <span className="text-stone-100 font-bold">{r.page_name}</span>
                          <span className="text-stone-600 font-mono text-xs ml-2">
                            {r.route_path}
                          </span>
                        </li>
                      ))}
                      {analysis.detected_routes.length > 6 && (
                        <li className="text-xs text-stone-600">
                          +{analysis.detected_routes.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Features */}
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">
                    Detected Features
                  </h4>
                  {analysis.detected_features.length === 0 ? (
                    <p className="text-xs text-stone-600">No features detected</p>
                  ) : (
                    <ul className="space-y-2">
                      {analysis.detected_features.slice(0, 6).map((f, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">✓</span>
                          <span className="text-stone-100">{f.feature_name}</span>
                        </li>
                      ))}
                      {analysis.detected_features.length > 6 && (
                        <li className="text-xs text-stone-600">
                          +{analysis.detected_features.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Database */}
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">
                    Detected Tables
                  </h4>
                  {analysis.detected_tables.length === 0 ? (
                    <p className="text-xs text-stone-600">No database detected</p>
                  ) : (
                    <ul className="space-y-2">
                      {analysis.detected_tables.slice(0, 6).map((t, i) => (
                        <li key={i} className="text-sm">
                          <span className="text-orange-400 font-mono">{t.table_name}</span>
                          <p className="text-stone-600 text-xs">{t.purpose}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/10 p-4 mb-6">
                <p className="text-xs font-black text-yellow-400 uppercase mb-2">
                  ⚠️ Notes
                </p>
                <ul className="space-y-1">
                  {analysis.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-yellow-300">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300 mb-4">
                {error}
              </div>
            )}

            {/* DESTINATION CHOICE */}
            <div className="rounded-2xl border border-stone-700 bg-stone-900 p-6">
              <h3 className="font-black text-stone-100 mb-2">Where do you want to go?</h3>
              <p className="text-stone-400 text-sm mb-6">
                Choose where to land after importing your project.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Planning */}
                <button
                  type="button"
                  onClick={() => handleCreate("planning")}
                  disabled={creating}
                  className="group rounded-2xl border border-stone-700 hover:border-orange-700/50 bg-stone-800 hover:bg-stone-700 p-6 text-left transition disabled:opacity-50"
                >
                  <div className="text-3xl mb-3">📋</div>
                  <h4 className="font-black text-stone-100 text-lg mb-1 group-hover:text-orange-400 transition">
                    Planning Stage
                  </h4>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    Review and edit the detected architecture first. Add missing
                    routes, features, or database tables before generating code.
                  </p>
                  <div className="mt-4 text-xs text-stone-600">
                    Best for: projects that need restructuring
                  </div>
                </button>

                {/* Forge */}
                <button
                  type="button"
                  onClick={() => handleCreate("forge")}
                  disabled={creating}
                  className="group rounded-2xl border border-orange-800/40 hover:border-orange-600 bg-stone-800 hover:bg-orange-900/10 p-6 text-left transition disabled:opacity-50"
                >
                  <div className="text-3xl mb-3">🔨</div>
                  <h4 className="font-black text-stone-100 text-lg mb-1 group-hover:text-orange-400 transition">
                    Enter The Forge
                  </h4>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    Jump straight into The Forge with your uploaded files loaded.
                    Ask Shang Tsung to continue building immediately.
                  </p>
                  <div className="mt-4 text-xs text-stone-600">
                    Best for: projects ready to continue building
                  </div>
                </button>
              </div>

              {creating && (
                <div className="mt-4 text-center text-sm text-stone-400">
                  {destination === "planning"
                    ? "Setting up Planning workspace..."
                    : "Loading your project in The Forge..."}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setStage("upload"); setAnalysis(null); setError(""); }}
              className="mt-4 text-sm text-stone-500 hover:text-stone-300 transition"
            >
              ← Upload a different file
            </button>
          </div>
        )}

        {/* STAGE: CREATING */}
        {stage === "creating" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🔨</div>
            <h2 className="text-3xl font-black mb-3 text-stone-100">
              {destination === "planning"
                ? "Setting Up Your Project..."
                : "Loading Your Project in The Forge..."}
            </h2>
            <p className="text-stone-400">Shang Tsung is preparing your workspace.</p>
          </div>
        )}
      </div>
    </main>
  );
}