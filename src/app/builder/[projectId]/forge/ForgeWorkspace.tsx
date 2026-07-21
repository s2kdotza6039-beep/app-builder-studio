"use client";

import { useState, useRef, useEffect } from "react";
import CodeViewer from "@/components/CodeViewer";
import VersionHistory from "@/components/VersionHistory";
import { useShangTsungHabits } from "@/hooks/useShangTsungHabits";

interface ProjectFile {
  id: string;
  project_id?: string;
  file_path: string;
  content: string;
  language: string;
}

interface ForgeResponse {
  success?: boolean;
  filesGenerated?: number;
  files?: ProjectFile[];
  error?: string;
}

type Notice = { type: "success" | "error"; text: string } | null;

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  id: string;
  rating?: "good" | "ok" | "bad";
}

interface SuggestionChip {
  label: string;
  message: string;
  icon: string;
}

const ALL_FORGE_CHIPS: SuggestionChip[] = [
  { icon: "🎨", label: "Hero orange", message: "Change the hero color to orange" },
  { icon: "💚", label: "Button green", message: "Make the button green" },
  { icon: "💰", label: "Add pricing", message: "Add a pricing section" },
  { icon: "⭐", label: "Add testimonials", message: "Add a testimonials section" },
  { icon: "❓", label: "Add FAQ", message: "Add a FAQ section" },
  { icon: "📏", label: "Bigger heading", message: "Make the heading larger" },
  { icon: "🌑", label: "Darker bg", message: "Make the background darker" },
  { icon: "📋", label: "What files?", message: "What files exist?" },
  { icon: "🔵", label: "Hero blue", message: "Change the hero color to blue" },
  { icon: "🟣", label: "Hero purple", message: "Change the hero color to purple" },
  { icon: "🔴", label: "Hero red", message: "Change the hero color to red" },
  { icon: "⚡", label: "Hero gold", message: "Change the hero color to gold" },
  { icon: "🚫", label: "Hide nav", message: "Hide the navigation" },
  { icon: "❓", label: "Help", message: "What can you do?" },
  { icon: "🕐", label: "Last session?", message: "What did we change last session?" },
  { icon: "📐", label: "More rounded", message: "Make the corners more rounded" },
  { icon: "🌿", label: "Button emerald", message: "Make the button emerald green" },
  { icon: "🔷", label: "Button blue", message: "Make the button blue" },
  { icon: "🟤", label: "Warm theme", message: "Change the background to a warm dark tone" },
  { icon: "📦", label: "Add features", message: "Add a features section to the homepage" },
  { icon: "🏆", label: "Add CTA", message: "Add a strong call to action section" },
  { icon: "🦶", label: "Add footer", message: "Add a professional footer" },
  { icon: "🖼️", label: "Add hero image", message: "Add a hero image placeholder" },
  { icon: "📊", label: "Add stats", message: "Add a statistics section with key numbers" },
  { icon: "🤝", label: "Add partners", message: "Add a partners or trusted by section" },
  { icon: "📰", label: "Add blog", message: "Add a blog or news section" },
  { icon: "🌍", label: "Add language", message: "Add a language selector to the navigation" },
  { icon: "🔒", label: "Security badge", message: "Add security and trust badges to the homepage" },
  { icon: "📱", label: "Mobile nav", message: "Improve the mobile navigation" },
  { icon: "✨", label: "Add animations", message: "Add subtle hover animations to cards and buttons" },
  { icon: "🎯", label: "Simplify", message: "Simplify the homepage — remove anything unnecessary" },
  { icon: "🖋️", label: "Elegant font", message: "Make the heading font more elegant and bold" },
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function readForgeResponse(response: Response): Promise<ForgeResponse> {
  const text = await response.text();
  if (!text) throw new Error(`Empty response. HTTP ${response.status}`);
  try { return JSON.parse(text) as ForgeResponse; }
  catch { throw new Error(`Server error. HTTP ${response.status}`); }
}

function createDownloadName(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "my-app"}.zip`;
}

function getFileIcon(path: string) {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "⚛️";
  if (path.endsWith(".ts")) return "📘";
  if (path.endsWith(".json")) return "📋";
  if (path.endsWith(".md")) return "📝";
  if (path.endsWith(".css")) return "🎨";
  return "📎";
}

async function saveVersion(projectId: string, label: string, instruction?: string) {
  try {
    await fetch(`/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, instruction }),
    });
  } catch {}
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function ForgeWorkspace({
  projectId,
  projectName,
  initialFiles,
  chatHistory = [],
}: {
  projectId: string;
  projectName: string;
  initialFiles: ProjectFile[];
  chatHistory?: { role: "user" | "assistant"; message: string }[];
}) {
  const habits = useShangTsungHabits(projectId);

  const [files, setFiles] = useState<ProjectFile[]>(initialFiles || []);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [shangCollapsed, setShangCollapsed] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [showLiveUrlInput, setShowLiveUrlInput] = useState(false);
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const [shangInput, setShangInput] = useState("");
  const [shangThinking, setShangThinking] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [chipPool, setChipPool] = useState<SuggestionChip[]>(
  ALL_FORGE_CHIPS.slice(0, 12)
);

  const buildInitialMessages = (): ChatMessage[] => {
    if (chatHistory.length === 0) {
      return [{
        id: generateId(),
        role: "assistant",
        message: "I am Shang Tsung — your Code Editor.\n\nTap a suggestion or type a command.",
      }];
    }
    const memoryNotice: ChatMessage = {
      id: generateId(),
      role: "assistant",
      message: `Welcome back, Founder. I remember our last ${chatHistory.length} message${chatHistory.length !== 1 ? "s" : ""}.\n\nAsk me "What did we change last session?" or tell me what to do next.`,
    };
    return [memoryNotice, ...chatHistory.map((m) => ({ ...m, id: generateId() }))];
  };

  const [shangMessages, setShangMessages] = useState<ChatMessage[]>(buildInitialMessages);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!habits.loaded) return;
    setShangCollapsed(habits.panelState.shangCollapsed);
    setExplorerCollapsed(habits.panelState.explorerCollapsed);
    setViewMode(habits.preferredViewMode);
    if (initialFiles.length > 0) {
      const mostUsed = habits.getMostUsedFilePath();
      const preferred = mostUsed ? initialFiles.find((f) => f.file_path === mostUsed) : null;
      setSelectedFile(preferred || initialFiles[0]);
    }
  }, [habits.loaded]);

  useEffect(() => {
    if (habits.loaded) habits.trackPanelState(shangCollapsed, explorerCollapsed);
  }, [shangCollapsed, explorerCollapsed, habits.loaded]);

  useEffect(() => {
    if (habits.loaded) habits.trackViewMode(viewMode);
  }, [viewMode, habits.loaded]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shangMessages]);

  useEffect(() => {
    async function checkGitHub() {
      try {
        const res = await fetch(`/api/projects/${projectId}/github`);
        const data = await res.json();
        setGithubConnected(data.connected || false);
        setGithubUsername(data.username || null);
      } catch {}
    }
    checkGitHub();
  }, [projectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const githubStatus = params.get("github");
    if (githubStatus === "connected") {
      setGithubConnected(true);
      setNotice({ type: "success", text: "GitHub connected!" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (githubStatus === "error" || githubStatus === "denied") {
      setNotice({ type: "error", text: "GitHub connection failed." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [projectId]);

  function handleShuffleChips() {
    setChipPool(shuffleArray(ALL_FORGE_CHIPS).slice(0, 12));
  }

  const sortedChips = habits.sortChipsByHabits(chipPool);
  const visibleChips = showAllChips ? sortedChips : sortedChips.slice(0, 4);

  async function handleCopyMessage(msgId: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }

  function handleRateMessage(msgId: string, rating: "good" | "ok" | "bad") {
    setShangMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, rating } : m))
    );
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/forge-api`, {
        method: "POST", headers: { Accept: "application/json" },
      });
      const data = await readForgeResponse(res);
      if (!res.ok) throw new Error(data.error || "Failed");
      if (files.length > 0) {
        await saveVersion(projectId, "Before regeneration", "Saved before generating new code");
      }
      setFiles(data.files || []);
      setSelectedFile(data.files?.[0] || null);
      setPreviewKey((k) => k + 1);
      setViewMode("preview");
      habits.trackViewMode("preview");
      setNotice({ type: "success", text: `Generated ${data.filesGenerated ?? data.files?.length} files.` });
      setShangMessages((prev) => [...prev, {
        id: generateId(),
        role: "assistant",
        message: `${data.filesGenerated ?? data.files?.length} files generated. What would you like to change?`,
      }]);
      await saveVersion(projectId, "Initial code generation", "First generation");
    } catch (e: any) {
      setNotice({ type: "error", text: e.message });
    } finally { setGenerating(false); }
  }

  async function handleDownload() {
    if (downloading || !files.length) return;
    setDownloading(true); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/download-api`, { method: "GET" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = createDownloadName(projectName);
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", text: "Downloaded successfully." });
    } catch (e: any) {
      setNotice({ type: "error", text: e.message });
    } finally { setDownloading(false); }
  }

  async function handleGitHubPush() {
    if (pushing || !files.length) return;
    if (!githubConnected) { window.location.href = `/api/auth/github?projectId=${projectId}`; return; }
    setPushing(true); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, { method: "POST" });
      const data = await res.json();
      if (data.needsConnection) { window.location.href = `/api/auth/github?projectId=${projectId}`; return; }
      if (res.ok) {
        setGithubUrl(data.repoUrl);
        setNotice({ type: "success", text: `✅ Pushed ${data.filespushed} files to GitHub!` });
      } else {
        setNotice({ type: "error", text: data.error || "GitHub push failed." });
      }
    } catch {
      setNotice({ type: "error", text: "Connection error." });
    } finally { setPushing(false); }
  }

  async function handleDeploy() {
    if (deploying) return;
    if (!githubConnected) { setNotice({ type: "error", text: "Push to GitHub first." }); return; }
    setDeploying(true); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) { setNotice({ type: "error", text: data.error || "Deploy failed." }); return; }
      window.open(data.vercelDeployUrl, "_blank");
      setShowLiveUrlInput(true);
      setNotice({ type: "success", text: "Vercel opened. Deploy, then paste your live URL below." });
    } catch {
      setNotice({ type: "error", text: "Connection error." });
    } finally { setDeploying(false); }
  }

  async function handleSaveLiveUrl() {
    if (!liveUrlInput.trim()) return;
    try {
      await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveUrl: liveUrlInput.trim() }),
      });
      setLiveUrl(liveUrlInput.trim());
      setShowLiveUrlInput(false);
      setLiveUrlInput("");
      setNotice({ type: "success", text: "🚀 Live URL saved!" });
    } catch {
      setNotice({ type: "error", text: "Failed to save live URL." });
    }
  }

  async function handleShangSend(messageText?: string) {
    const txt = messageText || shangInput.trim();
    if (!txt || shangThinking) return;
    if (messageText) habits.trackChipUsed(messageText);
    setShangInput("");
    setShangMessages((prev) => [...prev, { id: generateId(), role: "user", message: txt }]);
    setShangThinking(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/forge-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: txt }),
      });
      const data = await res.json();
      setShangMessages((prev) => [...prev, {
        id: generateId(),
        role: "assistant",
        message: data.reply || "Could not process that.",
      }]);
      if (data.updatedFiles?.length > 0) {
        await saveVersion(projectId, `Before: ${txt.slice(0, 50)}`, txt);
        setFiles((prev) => prev.map((f) => {
          const u = data.updatedFiles.find((x: { id: string }) => x.id === f.id);
          return u ? { ...f, content: u.content } : f;
        }));
        setSelectedFile((prev) => {
          if (!prev) return prev;
          const u = data.updatedFiles.find((x: { id: string }) => x.id === prev.id);
          return u ? { ...prev, content: u.content } : prev;
        });
        setPreviewKey((k) => k + 1);
        await saveVersion(projectId, txt.length > 50 ? txt.slice(0, 50) + "..." : txt, `Edited ${data.filesChanged} file${data.filesChanged === 1 ? "" : "s"}`);
        setShangMessages((prev) => [...prev, {
          id: generateId(),
          role: "assistant",
          message: `✅ ${data.filesChanged} file${data.filesChanged === 1 ? "" : "s"} updated. Preview refreshed. Version saved.`,
        }]);
      }
    } catch {
      setShangMessages((prev) => [...prev, { id: generateId(), role: "assistant", message: "Connection error. Please try again." }]);
    } finally { setShangThinking(false); }
  }

  function handleFileSelect(file: ProjectFile) {
    setSelectedFile(file);
    setViewMode("code");
    habits.trackFileOpened(file.file_path);
    habits.trackViewMode("code");
  }

  async function handleCopyFile() {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleVersionRestore(restoredFiles: ProjectFile[]) {
    if (restoredFiles.length > 0) {
      setFiles(restoredFiles);
      setSelectedFile(restoredFiles[0]);
      setPreviewKey((k) => k + 1);
      setViewMode("preview");
      setNotice({ type: "success", text: "Version restored successfully." });
    }
    setShowVersionHistory(false);
  }

  const hasFiles = files.length > 0;
  const showHabitBadge = habits.totalSessions >= 3;

  if (isFullScreen) {
    return (
      <div className="relative h-full w-full">
        <iframe key={previewKey} src={`/api/projects/${projectId}/preview`}
          className="h-full w-full border-0 bg-white" title="Live Preview Full Screen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-modals" />
        <button type="button" onClick={() => setIsFullScreen(false)}
          className="fixed top-4 right-4 z-50 rounded-xl bg-stone-900 border border-stone-700 hover:bg-stone-800 px-4 py-2.5 text-sm font-black text-stone-100 shadow-2xl transition">
          ✕ Exit Full Screen
        </button>
        <button type="button" onClick={() => setPreviewKey((k) => k + 1)}
          className="fixed top-4 right-44 z-50 rounded-xl bg-stone-900 border border-stone-700 hover:bg-stone-800 px-4 py-2.5 text-sm font-black text-stone-100 shadow-2xl transition">
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 relative">

      <VersionHistory projectId={projectId} onRestore={handleVersionRestore}
        isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />

      {/* Live URL Modal */}
      {showLiveUrlInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-2xl">
            <h3 className="font-black text-stone-100 text-lg mb-2">🚀 Save Your Live URL</h3>
            <p className="text-stone-400 text-sm mb-4">After Vercel finishes deploying, paste your live URL here.</p>
            <input type="url" value={liveUrlInput} onChange={(e) => setLiveUrlInput(e.target.value)}
              placeholder="https://your-app.vercel.app"
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600 mb-4"
              autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveLiveUrl(); }} />
            <div className="flex gap-3">
              <button type="button" onClick={handleSaveLiveUrl} disabled={!liveUrlInput.trim()}
                className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 py-3 text-sm font-black text-white transition">
                Save Live URL
              </button>
              <button type="button" onClick={() => { setShowLiveUrlInput(false); setLiveUrlInput(""); }}
                className="rounded-xl border border-stone-700 hover:bg-stone-800 px-4 py-3 text-sm text-stone-400 transition">
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHANG TSUNG PANEL ─────────────────────────────────────────────── */}
      {!shangCollapsed ? (
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-stone-800 bg-stone-900">
          <div className="border-b border-stone-800 bg-stone-950 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">🥋 Shang Tsung</p>
                {showHabitBadge && <span className="text-xs bg-orange-900/40 border border-orange-800/50 text-orange-400 px-1.5 py-0.5 rounded font-bold">Learned</span>}
                {chatHistory.length > 0 && <span className="text-xs bg-blue-900/40 border border-blue-800/50 text-blue-400 px-1.5 py-0.5 rounded font-bold">Memory</span>}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {chatHistory.length > 0 ? `Remembers last ${chatHistory.length} messages` : showHabitBadge ? `Session #${habits.totalSessions}` : "Code Editor"}
              </p>
            </div>
            <button type="button" onClick={() => setShangCollapsed(true)}
              className="rounded-lg border border-stone-700 hover:bg-stone-800 px-2 py-1 text-xs text-stone-400 hover:text-stone-100 transition">◀</button>
          </div>

          {/* ── CHAT MESSAGES ── */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
            {shangMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Single container — hover stays active when moving to buttons */}
                <div className="relative max-w-[92%] group">

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-orange-700 text-white rounded-br-none"
                      : "bg-stone-800 text-stone-200 rounded-bl-none"
                  }`}>
                    {msg.role === "assistant" && (
                      <p className="text-xs text-orange-400 font-black mb-1">🥋 Shang Tsung</p>
                    )}
                    {msg.message}

                    {/* Actions Row — visible on group hover */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.message)}
                        className="flex items-center gap-1 rounded-md bg-black/20 hover:bg-black/40 px-2 py-0.5 text-xs transition"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? "✓ Copied" : "📋 Copy"}
                      </button>

                      {/* Traffic Light Rating — assistant messages only */}
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 ml-auto" title="Rate this response">
                          <button
                            type="button"
                            onClick={() => handleRateMessage(msg.id, "good")}
                            className={`rounded-full w-4 h-4 flex-shrink-0 transition-transform ${msg.rating === "good" ? "ring-2 ring-white scale-125" : "opacity-60 hover:opacity-100 hover:scale-110"}`}
                            style={{ backgroundColor: "#22c55e" }}
                            title="Helpful"
                          />
                          <button
                            type="button"
                            onClick={() => handleRateMessage(msg.id, "ok")}
                            className={`rounded-full w-4 h-4 flex-shrink-0 transition-transform ${msg.rating === "ok" ? "ring-2 ring-white scale-125" : "opacity-60 hover:opacity-100 hover:scale-110"}`}
                            style={{ backgroundColor: "#f97316" }}
                            title="Partially helpful"
                          />
                          <button
                            type="button"
                            onClick={() => handleRateMessage(msg.id, "bad")}
                            className={`rounded-full w-4 h-4 flex-shrink-0 transition-transform ${msg.rating === "bad" ? "ring-2 ring-white scale-125" : "opacity-60 hover:opacity-100 hover:scale-110"}`}
                            style={{ backgroundColor: "#ef4444" }}
                            title="Not helpful"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating Label — always visible once rated */}
                  {msg.rating && msg.role === "assistant" && (
                    <p className="text-xs mt-1 px-1" style={{
                      color: msg.rating === "good" ? "#22c55e" : msg.rating === "ok" ? "#f97316" : "#ef4444"
                    }}>
                      {msg.rating === "good" ? "🟢 Helpful" : msg.rating === "ok" ? "🟠 Partially helpful" : "🔴 Not helpful"}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {shangThinking && (
              <div className="flex justify-start">
                <div className="bg-stone-800 text-stone-400 rounded-2xl rounded-bl-none px-3 py-2.5 text-sm italic">
                  Editing code...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* ── SUGGESTION CHIPS ── */}
          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-500 font-black uppercase tracking-wider">Quick Commands</p>
                {showHabitBadge && <span className="text-xs text-orange-500">↑ sorted</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShuffleChips}
                  className="text-xs text-stone-500 hover:text-orange-400 transition px-1.5 py-0.5 rounded border border-stone-700 hover:border-orange-600"
                  title="Shuffle suggestions"
                >
                  🔀
                </button>
                <button onClick={() => setShowAllChips(!showAllChips)}
                  className="text-xs text-stone-500 hover:text-stone-300 transition">
                  {showAllChips ? "Less" : "More"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleChips.map((chip, i) => {
                const usageCount = habits.session.chipUsage[chip.message]?.count || 0;
                return (
                  <button key={i} onClick={() => handleShangSend(chip.message)} disabled={shangThinking}
                    className={`flex items-center gap-1 rounded-lg border disabled:opacity-50 px-2 py-1.5 text-xs font-medium transition-all ${
                      usageCount > 2
                        ? "border-orange-800/60 bg-orange-900/20 text-orange-300 hover:border-orange-600"
                        : "border-stone-700 bg-stone-950 text-stone-300 hover:border-orange-700 hover:bg-stone-800 hover:text-stone-100"
                    }`}
                    title={usageCount > 0 ? `Used ${usageCount} time${usageCount !== 1 ? "s" : ""}` : undefined}>
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                    {usageCount > 2 && <span className="text-orange-500 text-xs ml-0.5">★</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CHAT INPUT ── */}
          <div className="border-t border-stone-800 p-3">
            <textarea value={shangInput} onChange={(e) => setShangInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleShangSend(); } }}
              rows={2} placeholder="Tell Shang Tsung what to change..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600 resize-none" />
            <button type="button" onClick={() => handleShangSend()} disabled={shangThinking || !shangInput.trim()}
              className="mt-1.5 w-full rounded-lg bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-3 py-2 text-sm font-black text-white transition">
              {shangThinking ? "Editing..." : "Send"}
            </button>
          </div>
        </aside>
      ) : (
        <div className="flex flex-col items-center border-r border-stone-800 bg-stone-900 w-10 shrink-0">
          <button type="button" onClick={() => setShangCollapsed(false)}
            className="w-full flex flex-col items-center gap-1 py-3 hover:bg-stone-800 transition group" title="Expand Shang Tsung">
            <span className="text-base">🥋</span>
            <span className="text-stone-600 group-hover:text-orange-400 transition text-xs">▶</span>
          </button>
        </div>
      )}

      {/* ── FILE EXPLORER PANEL ───────────────────────────────────────────── */}
      {!explorerCollapsed ? (
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-stone-800 bg-stone-900">
          <div className="p-3 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-stone-500 font-black">Files</p>
              <p className="text-xs text-stone-600 truncate">{projectName}</p>
            </div>
            <button type="button" onClick={() => setExplorerCollapsed(true)}
              className="rounded-lg border border-stone-700 hover:bg-stone-800 px-2 py-1 text-xs text-stone-400 hover:text-stone-100 transition">◀</button>
          </div>

          <div className="p-3 border-b border-stone-800 space-y-2">
            <button type="button" onClick={handleGenerate} disabled={generating}
              className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-xl py-2.5 text-sm font-black text-white transition">
              {generating ? "Generating..." : "🔨 Generate Code"}
            </button>
            <button type="button" onClick={handleDownload} disabled={downloading || !hasFiles}
              className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-40 rounded-xl py-2.5 text-sm font-black text-white transition">
              {downloading ? "Preparing..." : "📦 Download"}
            </button>
            {notice && (
              <div className={`border rounded-lg p-2.5 text-xs ${
                notice.type === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : "border-red-800 bg-red-950/40 text-red-300"
              }`}>{notice.text}</div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!hasFiles ? (
              <div className="rounded-xl border border-dashed border-stone-700 p-4 text-center mt-2">
                <p className="text-xs text-stone-500">No files yet.</p>
                <p className="text-xs text-stone-600 mt-1">Generate code first.</p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {files.map((f) => {
                  const openCount = habits.session.fileHistory[f.file_path]?.openCount || 0;
                  return (
                    <li key={f.id}>
                      <button type="button" onClick={() => handleFileSelect(f)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition ${
                          selectedFile?.id === f.id && viewMode === "code"
                            ? "bg-orange-900/40 border border-orange-800/50 text-orange-300"
                            : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                        }`}>
                        <span className="shrink-0 text-xs">{getFileIcon(f.file_path)}</span>
                        <span className="truncate font-mono text-xs flex-1">{f.file_path}</span>
                        {openCount >= 3 && <span className="text-orange-500 text-xs shrink-0">★</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-800 p-2 text-center text-xs text-stone-600">
            {files.length} file{files.length !== 1 ? "s" : ""}
            {showHabitBadge && <span className="ml-2 text-orange-600">· habits on</span>}
          </div>
        </aside>
      ) : (
        <div className="flex flex-col items-center border-r border-stone-800 bg-stone-900 w-10 shrink-0">
          <button type="button" onClick={() => setExplorerCollapsed(false)}
            className="w-full flex flex-col items-center gap-1 py-3 hover:bg-stone-800 transition group" title="Expand File Explorer">
            <span className="text-base">📁</span>
            <span className="text-stone-600 group-hover:text-stone-100 transition text-xs">▶</span>
          </button>
        </div>
      )}

      {/* ── MAIN AREA ─────────────────────────────────────────────────────── */}
      <section className="flex flex-1 min-w-0 flex-col bg-stone-950">
        <div className="flex h-11 items-center justify-between border-b border-stone-800 bg-stone-900 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setViewMode("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${viewMode === "preview" ? "bg-orange-700 text-white" : "text-stone-400 hover:bg-stone-800"}`}>
              👁 Preview
            </button>
            <button type="button" onClick={() => setViewMode("code")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${viewMode === "code" ? "bg-orange-700 text-white" : "text-stone-400 hover:bg-stone-800"}`}>
              {"</>"} Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "code" && selectedFile && (
              <>
                <span className="truncate font-mono text-xs text-stone-500 max-w-[100px]">{selectedFile.file_path}</span>
                <button type="button" onClick={handleCopyFile}
                  className="border border-stone-700 hover:border-stone-500 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">
                  {copied ? "✓" : "Copy"}
                </button>
              </>
            )}
            {viewMode === "preview" && hasFiles && (
              <button type="button" onClick={() => setPreviewKey((k) => k + 1)}
                className="border border-stone-700 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:bg-stone-800 transition">🔄</button>
            )}
            {hasFiles && (
              <button type="button" onClick={handleGitHubPush} disabled={pushing}
                className={`border px-2.5 py-1.5 rounded-lg text-xs font-black transition disabled:opacity-50 ${
                  githubConnected ? "border-emerald-800/50 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-400" : "border-stone-700 hover:border-stone-500 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100"
                }`}
                title={githubConnected ? `Push to GitHub (${githubUsername})` : "Connect GitHub"}>
                {pushing ? "Pushing..." : githubConnected ? "⬆ GitHub" : "⬆ Connect GitHub"}
              </button>
            )}
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                className="border border-emerald-800/50 bg-emerald-900/20 hover:bg-emerald-900/30 px-2.5 py-1.5 rounded-lg text-xs font-black text-emerald-400 transition">
                📂 GitHub
              </a>
            )}
            {hasFiles && githubConnected && (
              <button type="button" onClick={handleDeploy} disabled={deploying}
                className="border border-blue-800/50 bg-blue-900/20 hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg text-xs font-black text-blue-400 hover:text-blue-300 disabled:opacity-50 transition">
                {deploying ? "Opening..." : "🚀 Deploy"}
              </button>
            )}
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                className="border border-purple-800/50 bg-purple-900/20 hover:bg-purple-900/30 px-2.5 py-1.5 rounded-lg text-xs font-black text-purple-400 transition">
                🌐 Live
              </a>
            )}
            <button type="button" onClick={() => setShowVersionHistory(true)}
              className="border border-stone-700 hover:border-orange-700 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-orange-400 transition" title="Version History">
              ⏱
            </button>
            {hasFiles && viewMode === "preview" && (
              <button type="button" onClick={() => setIsFullScreen(true)}
                className="border border-stone-700 hover:border-orange-700 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">⛶</button>
            )}
            <button type="button" onClick={() => { setShangCollapsed(true); setExplorerCollapsed(true); }}
              className="border border-stone-700 hover:border-stone-500 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">⊞</button>
            {(shangCollapsed || explorerCollapsed) && (
              <button type="button" onClick={() => { setShangCollapsed(false); setExplorerCollapsed(false); }}
                className="border border-orange-800/50 bg-orange-900/20 hover:bg-orange-900/30 px-2.5 py-1.5 rounded-lg text-xs text-orange-400 hover:text-orange-300 transition">⊟</button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === "preview" ? (
            hasFiles ? (
              <iframe key={previewKey} src={`/api/projects/${projectId}/preview`}
                className="h-full w-full border-0 bg-white" title="Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-modals" />
            ) : (
              <div className="flex h-full items-center justify-center text-center px-6">
                <div>
                  <p className="text-lg text-stone-500 mb-2">No Preview Yet</p>
                  <p className="text-sm text-stone-600">Click Generate Code to build your app.</p>
                </div>
              </div>
            )
          ) : selectedFile ? (
            <CodeViewer code={selectedFile.content} language={selectedFile.language} filePath={selectedFile.file_path} />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 text-sm">Select a file to view its code.</div>
          )}
        </div>
      </section>
    </div>
  );
}