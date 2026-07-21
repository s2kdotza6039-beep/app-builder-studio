"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  app_name: string;
  app_description: string | null;
  app_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  _count?: {
    files: number;
    routes: number;
    features: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Unable to load projects workspace");
      }
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(id: string, appName: string) {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project");
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  // Filter logic: match category tab AND search query
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesTab =
        activeTab === "ALL" ||
        p.status.toUpperCase() === activeTab.toUpperCase() ||
        (activeTab === "BUILDING" && p.status === "BUILDING") ||
        (activeTab === "PLANNING" && p.status === "PLANNING");

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.app_name.toLowerCase().includes(query) ||
        (p.app_description && p.app_description.toLowerCase().includes(query)) ||
        (p.app_type && p.app_type.toLowerCase().includes(query));

      return matchesTab && matchesSearch;
    });
  }, [projects, activeTab, searchQuery]);

  const categories = [
    { label: "All Projects", id: "ALL", count: projects.length },
    { label: "Building (The Forge)", id: "BUILDING", count: projects.filter((p) => p.status === "BUILDING").length },
    { label: "Planning Stage", id: "PLANNING", count: projects.filter((p) => p.status === "PLANNING").length },
    { label: "Ideas", id: "IDEA", count: projects.filter((p) => p.status === "IDEA").length },
  ];

  function getStatusBadge(status: string) {
    switch (status.toUpperCase()) {
      case "BUILDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> The Forge Live
          </span>
        );
      case "PLANNING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Architecture Plan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Raw Idea
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-orange-500 selection:text-white">
      {/* Ambient Radial Spectrum Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-orange-600/10 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-sm shadow-lg shadow-orange-500/20">
              ⚡
            </span>
            <span>App Builder Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/brain-dump"
              className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              + Create New Project
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1 text-xs font-semibold text-orange-400 mb-3 shadow-inner">
              Workspace Dashboard
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">Your Applications</h1>
            <p className="text-zinc-400 text-sm mt-2">
              Manage, filter, and enter The Forge to generate and edit code with Shang Tsung.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-5 py-3 rounded-2xl">
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase font-semibold">Total Projects</p>
              <p className="text-2xl font-black text-white">{projects.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search Input */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8 bg-white/[0.02] border border-white/10 p-2 rounded-2xl backdrop-blur-md">
          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto p-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === cat.id
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === cat.id ? "bg-black/30 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Search projects by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="border border-white/10 bg-white/[0.02] rounded-3xl p-16 text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 font-medium text-sm">Loading your Lovable-grade workspace...</p>
          </div>
        )}

        {error && !loading && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-3xl p-8 text-center text-red-300">
            <p className="font-bold mb-2">Error Loading Projects</p>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={fetchProjects}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="border border-white/10 bg-white/[0.02] rounded-3xl p-16 text-center backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto mb-6">
              📂
            </div>
            <h3 className="text-2xl font-black text-white mb-2">No Projects Found</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-8">
              {searchQuery || activeTab !== "ALL"
                ? "No applications matched your current filter criteria or search query. Try clearing filters."
                : "Your workspace is currently empty. Start by describing your app idea in plain language!"}
            </p>
            {searchQuery || activeTab !== "ALL" ? (
              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setSearchQuery("");
                }}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-bold text-white transition"
              >
                Clear All Filters
              </button>
            ) : (
              <Link
                href="/brain-dump"
                className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-8 py-4 font-bold text-white shadow-xl shadow-orange-600/20 inline-block transition"
              >
                + Create Your First Project
              </Link>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="group border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md rounded-3xl p-6 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {getStatusBadge(p.status)}
                    <span className="text-[11px] font-mono text-zinc-500">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-orange-400 transition-colors mb-2 line-clamp-1">
                    {p.app_name}
                  </h3>
                  <p className="text-zinc-400 text-xs leading-relaxed mb-6 line-clamp-2">
                    {p.app_description || "No description provided for this project yet."}
                  </p>

                  {/* Project Stats Pill */}
                  <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 font-mono mb-6">
                    <span>📄 {p._count?.files || 0} Files</span>
                    <span>•</span>
                    <span>🧭 {p._count?.routes || 0} Routes</span>
                    <span>•</span>
                    <span>⚡ {p._count?.features || 0} Features</span>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4 mt-auto">
                  <div className="flex items-center gap-2 flex-1">
                    {p.status === "BUILDING" ? (
                      <Link
                        href={`/projects/${p.id}/forge`}
                        className="flex-1 text-center rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition"
                      >
                        ⚡ Enter The Forge
                      </Link>
                    ) : (
                      <Link
                        href={`/projects/${p.id}/planning`}
                        className="flex-1 text-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition"
                      >
                        📋 Planning Stage
                      </Link>
                    )}
                  </div>

                  {/* Delete Project Button */}
                  <button
                    onClick={() => setDeleteConfirmId(p.id)}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-red-500/30 bg-white/[0.02] hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition"
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                </div>

                {/* Delete Confirmation Modal for this Card */}
                {deleteConfirmId === p.id && (
                  <div className="absolute inset-0 z-20 bg-[#09090b]/95 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-fadeIn border border-red-500/30 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-xl mb-3">
                      ⚠️
                    </div>
                    <h4 className="text-lg font-black text-white mb-1">Delete "{p.app_name}"?</h4>
                    <p className="text-zinc-400 text-xs mb-6 max-w-[240px]">
                      This action permanently deletes all generated files, routes, versions, and chat history.
                    </p>
                    <div className="flex items-center gap-3 w-full">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id, p.app_name)}
                        disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-1.5"
                      >
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}