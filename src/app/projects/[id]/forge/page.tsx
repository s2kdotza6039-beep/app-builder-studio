"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface GeneratedFile {
  id?: string;
  file_path: string;
  content: string;
  language: string;
}

interface VersionItem {
  id: string;
  version_number: number;
  label: string | null;
  instruction: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}

interface Project {
  id: string;
  app_name: string;
  app_description: string | null;
  status: string;
  files: GeneratedFile[];
  versions?: VersionItem[];
  aiMessages?: ChatMessage[];
}

export default function ForgeStudioPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Studio UI Control State (Collapsible & Fullscreen)
  const [activeTab, setActiveTab] = useState<"FILES" | "VERSIONS">("FILES");
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [viewport, setViewport] = useState<"DESKTOP" | "TABLET" | "MOBILE">("DESKTOP");
  const [previewPath, setPreviewPath] = useState<string>("/");
  const [previewKey, setPreviewKey] = useState<number>(Date.now());

  // Collapsible Panels & Draggable Splitter Widths
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  const [fullscreenPreview, setFullscreenPreview] = useState<boolean>(false);

  const [leftWidth, setLeftWidth] = useState<number>(300);
  const [rightWidth, setRightWidth] = useState<number>(380);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  // Dynamic Project-Tailored Quick Commands State
  const [quickCommands, setQuickCommands] = useState<string[]>([]);
  const [shufflingSuggestions, setShufflingSuggestions] = useState<boolean>(false);
  const [showSuggestionsDrawer, setShowSuggestionsDrawer] = useState<boolean>(true);

  // Shang Tsung Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [chatting, setChatting] = useState<boolean>(false);
  const [generatingCode, setGeneratingCode] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  // External Action States (GitHub & Vercel)
  const [pushingGithub, setPushingGithub] = useState<boolean>(false);
  const [deployingVercel, setDeployingVercel] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchForgeData();
      fetchQuickCommands();
    }
  }, [projectId]);

  useEffect(() => {
    if (!fullscreenPreview && rightOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatting, fullscreenPreview, rightOpen]);

  // Mouse Drag Handlers for Draggable Column Splitters
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newW = Math.max(200, Math.min(650, e.clientX));
        setLeftWidth(newW);
      }
      if (isResizingRight) {
        const newW = Math.max(280, Math.min(750, window.innerWidth - e.clientX));
        setRightWidth(newW);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  async function fetchForgeData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Unable to load project inside The Forge");
      }
      const data = await res.json();
      const proj = data.project;
      if (!proj) throw new Error("Project not found");

      setProject(proj);
      if (proj.files && proj.files.length > 0) {
        const homeFile = proj.files.find((f: GeneratedFile) => f.file_path.toLowerCase() === "app/page.tsx");
        setSelectedFile(homeFile || proj.files[0]);
      }
      if (proj.aiMessages) {
        setMessages(proj.aiMessages);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch Forge workspace");
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuickCommands() {
    setShufflingSuggestions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/suggestions`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setQuickCommands(data.suggestions);
      } else {
        setQuickCommands([
          "Create a custom vector SVG logo component inside components/Logo.tsx with a warm dining theme and embed it in Navigation.tsx",
          "Modify app/page.tsx to add a high-converting 3-tier SaaS pricing calculator with animated toggle switches",
          "Create a modern analytics metrics section inside app/dashboard/page.tsx with statistical growth charts",
          "Add glowing glassmorphic customer review cards on app/reviews/page.tsx with 5-star badges",
        ]);
      }
    } catch {
      setQuickCommands([
        "Create a custom vector SVG logo component inside components/Logo.tsx with a warm dining theme and embed it in Navigation.tsx",
        "Modify app/page.tsx to add a high-converting 3-tier SaaS pricing calculator with animated toggle switches",
        "Create a modern analytics metrics section inside app/dashboard/page.tsx with statistical growth charts",
        "Add glowing glassmorphic customer review cards on app/reviews/page.tsx with 5-star badges",
      ]);
    } finally {
      setShufflingSuggestions(false);
    }
  }

  async function handleSendMessage(e?: React.FormEvent, presetCmd?: string) {
    if (e) e.preventDefault();
    const textToSend = presetCmd || inputMessage;
    if (!textToSend.trim() || chatting || !project) return;

    if (fullscreenPreview) setFullscreenPreview(false);
    if (!rightOpen) setRightOpen(true);

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      message: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setChatting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/forge-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Shang Tsung encountered an error while editing code");
      }

      const assistantMsg: ChatMessage = {
        id: `local-${Date.now() + 1}`,
        role: "assistant",
        message: data.reply || "Done. Your changes have been applied in The Forge.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.filesChanged > 0 || (data.updatedFiles && data.updatedFiles.length > 0) || (data.newFiles && data.newFiles.length > 0)) {
        await fetchForgeData();
        setPreviewKey(Date.now());
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `local-err-${Date.now()}`,
        role: "assistant",
        message: `⚠️ Dojo Error: ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatting(false);
    }
  }

  async function handleRegenerateCode() {
    if (generatingCode || !project) return;
    if (!confirm("Are you sure you want to regenerate all code files? This will overwrite manual edits.")) return;

    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/forge-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regeneration failed");

      await fetchForgeData();
      setPreviewKey(Date.now());
    } catch (err: any) {
      alert(`Regeneration error: ${err.message}`);
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleRestoreVersion(versionId: string, versionLabel: string | null) {
    if (restoring || !project) return;
    if (!confirm(`Restore project to "${versionLabel || versionId}"? Current edits will be auto-saved as a backup.`)) return;

    setRestoring(versionId);
    try {
      const res = await fetch(`/api/projects/${project.id}/versions/${versionId}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");

      await fetchForgeData();
      setPreviewKey(Date.now());
      alert(`✅ Restored to version successfully!`);
    } catch (err: any) {
      alert(`Restore error: ${err.message}`);
    } finally {
      setRestoring(null);
    }
  }

  async function handlePushGithub() {
    if (pushingGithub || !project) return;
    setPushingGithub(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/github/push`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub push failed");
      alert(`✅ Successfully pushed "${project.app_name}" to your connected GitHub repository!`);
    } catch (err: any) {
      alert(`🐙 GitHub Push Info: ${err.message || "Ensure your GitHub token is connected in Settings."}`);
    } finally {
      setPushingGithub(false);
    }
  }

  async function handleDeployVercel() {
    if (deployingVercel || !project) return;
    setDeployingVercel(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/vercel/deploy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vercel deployment failed");
      alert(`🚀 Successfully triggered Vercel live deployment for "${project.app_name}"! Check your Vercel dashboard.`);
    } catch (err: any) {
      alert(`🚀 Vercel Deploy Info: ${err.message || "Ensure your Vercel account token is linked in Settings."}`);
    } finally {
      setDeployingVercel(false);
    }
  }

  function handleDownloadZip() {
    if (!project || !project.files || project.files.length === 0) {
      alert("No files generated yet to download.");
      return;
    }
    window.open(`/api/projects/${project.id}/export/zip`, "_blank");
  }

  function getFileIcon(path: string) {
    if (path.endsWith(".json")) return "📋";
    if (path.endsWith(".md")) return "📝";
    if (path.includes("layout")) return "🏛️";
    if (path.includes("Navigation")) return "🧭";
    if (path.includes("Logo")) return "🎨";
    if (path.includes("page.tsx")) return "⚛️";
    return "📄";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium text-sm">Entering The Forge (Lovable-Grade Workspace)...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <div className="border border-red-500/30 bg-red-500/10 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-xl font-black text-red-300 mb-2">Error Loading The Forge</h2>
          <p className="text-zinc-400 text-xs mb-6">{error || "Project workspace unavailable."}</p>
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

  const previewUrl = `/api/projects/${project.id}/preview?path=${encodeURIComponent(previewPath)}&k=${previewKey}`;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden selection:bg-orange-500 selection:text-white">
      {/* Top Studio Header Bar */}
      <header className="h-16 border-b border-white/10 bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project.id}/planning`}
            className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1.5 font-medium whitespace-nowrap"
            title="Return to Planning Stage Blueprint"
          >
            <span>←</span> <span className="hidden sm:inline">Planning Blueprint</span>
          </Link>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs shadow-md shadow-orange-500/20">
              ⚡
            </span>
            <span className="font-black text-white text-sm tracking-tight truncate max-w-[140px] sm:max-w-xs">
              {project.app_name}
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> The Forge Live
            </span>
          </div>
        </div>

        {/* Action Header Buttons (Glowing GitHub, Vercel, Download, & Re-Generate) */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1">
          <button
            onClick={handlePushGithub}
            disabled={pushingGithub}
            className="group relative rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-3.5 py-2 text-xs font-bold text-purple-300 hover:text-white transition flex items-center gap-1.5 shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 whitespace-nowrap"
            title="Push generated Next.js code directly to your GitHub repository"
          >
            <span className="text-sm group-hover:scale-110 transition-transform">⬆</span>
            <span>{pushingGithub ? "Pushing..." : "GitHub"}</span>
          </button>

          <button
            onClick={handleDeployVercel}
            disabled={deployingVercel}
            className="group relative rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:text-white transition flex items-center gap-1.5 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 whitespace-nowrap"
            title="Trigger instant one-click Vercel live cloud deployment"
          >
            <span className="text-sm group-hover:scale-110 transition-transform">🚀</span>
            <span>{deployingVercel ? "Deploying..." : "Vercel Live"}</span>
          </button>

          <button
            onClick={handleRegenerateCode}
            disabled={generatingCode}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap hidden sm:flex"
            title="Regenerate all code files from the architecture blueprint"
          >
            <span>🔄</span> {generatingCode ? "Rebuilding..." : "Re-Generate"}
          </button>

          <button
            onClick={handleDownloadZip}
            className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-600/20 hover:-translate-y-0.5 transition flex items-center gap-1.5 whitespace-nowrap"
            title="Download complete project code as ZIP archive"
          >
            <span>📦</span> Download ZIP
          </button>
        </div>
      </header>

      {/* Workspace Control Bar (Collapsible Panel & Fullscreen Viewport Toggles) */}
      <div className="h-9 bg-black/60 border-b border-white/10 px-4 flex items-center justify-between text-xs font-bold text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-2">
          {!fullscreenPreview && (
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="hover:text-white transition flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg"
              title="Toggle Left Code & Files Drawer"
            >
              <span>{leftOpen ? "◀ Collapse Files" : "📂 Expand Files ▶"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Lovable-Grade Workspace Control:</span>
          <button
            onClick={() => {
              setFullscreenPreview(!fullscreenPreview);
              if (!fullscreenPreview) {
                setLeftOpen(false);
                setRightOpen(false);
              } else {
                setLeftOpen(true);
                setRightOpen(true);
              }
            }}
            className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 border ${
              fullscreenPreview
                ? "bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/30"
                : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Toggle Fullscreen Live Preview Screen"
          >
            <span>{fullscreenPreview ? "❌ Exit Fullscreen" : "⛶ Fullscreen Preview"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!fullscreenPreview && (
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="hover:text-white transition flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg"
              title="Toggle Right Shang Tsung AI Dojo Master Drawer"
            >
              <span>{rightOpen ? "Shang Tsung ▶" : "◀ Expand Shang Tsung"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Column Studio Grid with Draggable Resizable Splitter Columns */}
      <div className="flex-1 flex overflow-hidden relative select-none">
        {/* Column 1: Left Panel (Files & Versions Tree) — Draggable Width */}
        {!fullscreenPreview && leftOpen && (
          <div
            style={{ width: `${leftWidth}px` }}
            className="border-r border-white/10 bg-black/40 flex flex-col h-full overflow-hidden shrink-0 transition-none"
          >
            {/* Panel Tabs */}
            <div className="flex border-b border-white/10 p-2 gap-1 bg-[#09090b]">
              <button
                onClick={() => setActiveTab("FILES")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === "FILES" ? "bg-white/10 text-white shadow-inner" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>📂</span> Files ({project.files?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("VERSIONS")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === "VERSIONS" ? "bg-white/10 text-white shadow-inner" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>⏱️</span> History ({project.versions?.length || 0})
              </button>
            </div>

            {/* Files List View */}
            {activeTab === "FILES" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {project.files && project.files.length > 0 ? (
                  project.files.map((file) => (
                    <button
                      key={file.id || file.file_path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono transition flex items-center gap-2.5 ${
                        selectedFile?.file_path === file.file_path
                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                      }`}
                    >
                      <span>{getFileIcon(file.file_path)}</span>
                      <span className="truncate">{file.file_path}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No code files generated yet. Click Re-Generate Code above.
                  </div>
                )}
              </div>
            )}

            {/* Versions History View */}
            {activeTab === "VERSIONS" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {project.versions && project.versions.length > 0 ? (
                  project.versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="font-bold text-orange-400">v{ver.version_number}</span>
                          <span className="text-zinc-500">{new Date(ver.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs font-medium text-white line-clamp-2">{ver.label || "Auto-saved snapshot"}</p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(ver.id, ver.label)}
                        disabled={restoring === ver.id}
                        className="w-full mt-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-zinc-300 hover:text-white transition disabled:opacity-50"
                      >
                        {restoring === ver.id ? "Restoring..." : "↩ Restore This Version"}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">No version snapshots recorded yet.</div>
                )}
              </div>
            )}

            {/* Code Viewer Drawer */}
            {selectedFile && (
              <div className="h-64 border-t border-white/10 bg-black/60 flex flex-col overflow-hidden shrink-0">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#09090b]">
                  <span className="text-[11px] font-mono font-bold text-orange-400 flex items-center gap-1.5 truncate">
                    <span>{getFileIcon(selectedFile.file_path)}</span> {selectedFile.file_path}
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-400 uppercase font-bold">
                    {selectedFile.language}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre selection:bg-orange-500 selection:text-white">
                  {selectedFile.content}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Splitter Bar 1: Between Left Panel & Center Preview */}
        {!fullscreenPreview && leftOpen && (
          <div
            onMouseDown={() => setIsResizingLeft(true)}
            onDoubleClick={() => setLeftWidth(300)}
            className="w-1.5 bg-white/5 hover:bg-orange-500/60 active:bg-orange-500 cursor-col-resize shrink-0 transition-colors flex items-center justify-center text-[8px] text-zinc-600 hover:text-white z-20"
            title="Drag to resize left files panel (Double-click to snap back)"
          >
            ⋮
          </div>
        )}

        {/* Column 2: Center Panel (Live Interactive Preview Iframe) — Responsive Scaling */}
        <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden relative min-w-0">
          {/* Iframe Top Bar */}
          <div className="h-12 border-b border-white/10 bg-[#09090b] px-4 flex items-center justify-between gap-3 shrink-0">
            {/* Route Path Input Bar */}
            <div className="flex items-center gap-2 flex-1 max-w-md bg-black/50 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-zinc-500 text-xs">🌐</span>
              <input
                type="text"
                value={previewPath}
                onChange={(e) => setPreviewPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPreviewKey(Date.now())}
                placeholder="/"
                className="bg-transparent border-none text-xs text-white font-mono w-full focus:outline-none"
              />
              <button
                onClick={() => setPreviewKey(Date.now())}
                className="text-zinc-400 hover:text-white text-xs"
                title="Refresh Preview Iframe"
              >
                🔄
              </button>
            </div>

            {/* Device Viewport Toggle Buttons */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setViewport("DESKTOP")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewport === "DESKTOP" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-zinc-400 hover:text-white"
                }`}
                title="Desktop Viewport (100% width)"
              >
                🖥️ <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setViewport("TABLET")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewport === "TABLET" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-zinc-400 hover:text-white"
                }`}
                title="Tablet Viewport (768px width)"
              >
                📱 <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                onClick={() => setViewport("MOBILE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewport === "MOBILE" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "text-zinc-400 hover:text-white"
                }`}
                title="Mobile Viewport (375px width)"
              >
                📲 <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto bg-black/40 relative w-full h-full">
            <div
              className={`h-full bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ${
                viewport === "DESKTOP" ? "w-full" : viewport === "TABLET" ? "w-[768px] max-w-full" : "w-[375px] max-w-full"
              }`}
            >
              <iframe
                key={previewKey}
                src={previewUrl}
                title="Lovable-Grade Live App Preview"
                className="w-full h-full border-none bg-[#09090b]"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        </div>

        {/* Splitter Bar 2: Between Center Preview & Right Panel */}
        {!fullscreenPreview && rightOpen && (
          <div
            onMouseDown={() => setIsResizingRight(true)}
            onDoubleClick={() => setRightWidth(380)}
            className="w-1.5 bg-white/5 hover:bg-orange-500/60 active:bg-orange-500 cursor-col-resize shrink-0 transition-colors flex items-center justify-center text-[8px] text-zinc-600 hover:text-white z-20"
            title="Drag to resize right Shang Tsung panel (Double-click to snap back)"
          >
            ⋮
          </div>
        )}

        {/* Column 3: Right Panel (Shang Tsung AI Dojo Master) — Draggable Width */}
        {!fullscreenPreview && rightOpen && (
          <div
            style={{ width: `${rightWidth}px` }}
            className="border-l border-white/10 bg-[#09090b] flex flex-col h-full overflow-hidden shrink-0 transition-none"
          >
            {/* Shang Tsung Header */}
            <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-black/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🥋</span>
                <span className="font-black text-white text-xs tracking-tight">Shang Tsung AI Dojo Master</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Online
              </span>
            </div>

            {/* Permanent Quick Command Suggestions Bar (ALWAYS VISIBLE AT TOP OF PANEL) */}
            <div className="border-b border-white/10 bg-black/30 p-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowSuggestionsDrawer(!showSuggestionsDrawer)}
                  className="text-[11px] font-black uppercase text-orange-400 flex items-center gap-1.5 hover:text-white transition"
                >
                  <span>💡</span> Tailored Quick Commands {showSuggestionsDrawer ? "▼" : "▶"}
                </button>
                <button
                  onClick={fetchQuickCommands}
                  disabled={shufflingSuggestions}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                  title="Shuffle and generate fresh project-tailored commands"
                >
                  <span>✨</span> {shufflingSuggestions ? "Shuffling..." : "Shuffle"}
                </button>
              </div>

              {showSuggestionsDrawer && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {quickCommands.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(undefined, cmd)}
                      disabled={chatting}
                      className="w-full text-left p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:border-orange-500/40 hover:bg-orange-500/10 text-[11px] text-zinc-300 hover:text-white transition disabled:opacity-50 line-clamp-2 leading-snug font-medium"
                    >
                      💡 {cmd}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xl mx-auto mb-3">
                    🥋
                  </div>
                  <h4 className="font-black text-white text-sm mb-1">Your AI Dojo Master</h4>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Tell me what to change or pick any Quick Command above. I automatically extract clean vector SVG logos and refresh your preview!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {msg.role === "user" ? "You" : "🥋 Shang Tsung"}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl p-3.5 text-xs leading-relaxed max-w-[92%] font-medium ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none shadow-md shadow-orange-600/20"
                          : "bg-white/[0.04] border border-white/10 text-zinc-200 rounded-bl-none shadow-xl whitespace-pre-wrap"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
              {chatting && (
                <div className="flex flex-col gap-1 items-start">
                  <div className="rounded-2xl rounded-bl-none p-4 bg-white/[0.04] border border-white/10 text-zinc-400 text-xs flex items-center gap-3 shadow-lg">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Shang Tsung is analyzing, creating vector SVGs, and editing your code...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/40 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={chatting}
                  placeholder="Instruct Shang Tsung what to change or create..."
                  className="w-full bg-[#09090b] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || chatting}
                  className="absolute right-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 w-8 h-8 flex items-center justify-center text-white text-xs font-bold transition disabled:opacity-30 shadow-md shadow-orange-600/20"
                  title="Send Command"
                >
                  ↑
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 px-1 text-center">
                Shang Tsung auto-modifies code, creates vector logos (`components/Logo.tsx`), and refreshes preview.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}