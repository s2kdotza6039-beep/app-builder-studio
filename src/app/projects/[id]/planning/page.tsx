"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface RouteItem {
  id: string;
  page_name: string;
  route_path: string;
  purpose: string | null;
  access_level: string | null;
}

interface FeatureItem {
  id: string;
  feature_name: string;
  priority: string | null;
  complexity: string | null;
  status: string | null;
}

interface TableItem {
  id: string;
  table_name: string;
  purpose: string | null;
  fields_json: any;
}

interface Project {
  id: string;
  app_name: string;
  app_description: string | null;
  app_type: string | null;
  status: string;
  routes: RouteItem[];
  features: FeatureItem[];
  databaseTables: TableItem[];
}

export default function PlanningStagePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  async function fetchProjectData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Unable to load architecture plan for this project");
      }
      const data = await res.json();
      setProject(data.project || null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch project data");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnterForge() {
    if (generating || !project) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/forge-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate project code inside The Forge");
      }
      router.push(`/projects/${project.id}/forge`);
    } catch (err: any) {
      alert(`Forge Generation Error: ${err.message}`);
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium text-sm">Loading Lovable-grade architecture plan...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="border border-red-500/30 bg-red-500/10 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-red-300 mb-2">Error Loading Planning Stage</h2>
          <p className="text-zinc-400 text-xs mb-6">{error || "Project data unavailable."}</p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 hover:bg-white/20 px-6 py-3 text-xs font-bold text-white transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-orange-500 selection:text-white">
      {/* Ambient Spectrum Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-gradient-to-tr from-indigo-600/15 via-orange-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1">
              <span>←</span> Dashboard
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Stage 1: Planning</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleEnterForge}
              disabled={generating}
              className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
            >
              {generating ? "⚡ Building Code..." : "⚡ Enter The Forge →"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Header */}
        <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Architecture Blueprint
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">{project.app_name}</h1>
          <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed mb-6">
            {project.app_description || "No description provided. This blueprint outlines your application's modular routes, features, and relational tables."}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400">
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Type: <span className="text-white font-bold">{project.app_type || "Custom App"}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Routes: <span className="text-orange-400 font-bold">{project.routes?.length || 0}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Features: <span className="text-indigo-400 font-bold">{project.features?.length || 0}</span>
            </div>
            <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              Database Tables: <span className="text-emerald-400 font-bold">{project.databaseTables?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Modular Grid Section */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Column 1: Application Routes */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>🧭</span> Application Routes
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.routes?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                The structured Next.js App Router pages that Shang Tsung will generate inside The Forge (`app/[route]/page.tsx`).
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.routes && project.routes.length > 0 ? (
                  project.routes.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{r.page_name}</span>
                        <span className="font-mono text-[11px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                          {r.route_path}
                        </span>
                      </div>
                      {r.purpose && <p className="text-zinc-500 text-[11px] mt-2 leading-normal">{r.purpose}</p>}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No routes defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Key Features */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>⚡</span> Planned Features
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.features?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Core interactive functionalities, authentication flows, and dynamic UI modules slated for implementation.
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.features && project.features.length > 0 ? (
                  project.features.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{f.feature_name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {f.priority || "Standard"}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-[11px] mt-1">Status: {f.status || "Planned"}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No features defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Database Tables */}
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <span>🗄️</span> Database Schema
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  {project.databaseTables?.length || 0}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Relational PostgreSQL schema models and data fields pre-configured for Prisma ORM integration.
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {project.databaseTables && project.databaseTables.length > 0 ? (
                  project.databaseTables.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/15 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-emerald-400 font-mono text-sm">{t.table_name}</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          TABLE
                        </span>
                      </div>
                      {t.purpose && <p className="text-zinc-500 text-[11px] mt-1 leading-normal">{t.purpose}</p>}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-black/20 rounded-2xl border border-dashed border-white/5">
                    No database schema models defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action Banner */}
        <div className="mt-12 rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-black to-indigo-950/40 p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">Ready to enter The Forge?</h3>
            <p className="text-zinc-400 text-xs max-w-xl leading-relaxed">
              When you click Enter The Forge, Shang Tsung will read this architectural blueprint and instantly generate real, downloadable Next.js + Tailwind CSS code files.
            </p>
          </div>
          <button
            onClick={handleEnterForge}
            disabled={generating}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-bold text-white text-sm shadow-2xl shadow-orange-600/30 transition-all duration-300 whitespace-nowrap disabled:opacity-50"
          >
            {generating ? "⚡ Generating Real Code..." : "⚡ Enter The Forge Now →"}
          </button>
        </div>
      </main>
    </div>
  );
}