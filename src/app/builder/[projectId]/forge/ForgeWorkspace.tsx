"use client";

import { useState, useRef, useEffect } from "react";
import CodeViewer from "@/components/CodeViewer";
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
interface ChatMessage { role: "user" | "assistant"; message: string; }
interface SuggestionChip { label: string; message: string; icon: string; }

const FORGE_CHIPS: SuggestionChip[] = [
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
  { icon: "🚫", label: "Hide nav", message: "Hide the navigation" },
  { icon: "❓", label: "Help", message: "What can you do?" },
];

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

export default function ForgeWorkspace({
  projectId,
  projectName,
  initialFiles,
}: {
  projectId: string;
  projectName: string;
  initialFiles: ProjectFile[];
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
  const [shangMessages, setShangMessages] = useState<ChatMessage[]>([
    { role: "assistant", message: "I am Shang Tsung.\n\nTap a suggestion or type a command." },
  ]);
  const [shangInput, setShangInput] = useState("");
  const [shangThinking, setShangThinking] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Apply saved habits on load
  useEffect(() => {
    if (!habits.loaded) return;

    // Restore panel state
    setShangCollapsed(habits.panelState.shangCollapsed);
    setExplorerCollapsed(habits.panelState.explorerCollapsed);

    // Restore preferred view mode
    setViewMode(habits.preferredViewMode);

    // Select most-used file if files exist
    if (initialFiles.length > 0) {
      const mostUsed = habits.getMostUsedFilePath();
      const preferred = mostUsed
        ? initialFiles.find((f) => f.file_path === mostUsed)
        : null;
      setSelectedFile(preferred || initialFiles[0]);
    }

    // Show habit-aware greeting after 3+ sessions
    const summary = habits.getHabitSummary();
    if (summary && habits.totalSessions >= 3) {
      setShangMessages([
        {
          role: "assistant",
          message: `Welcome back, Founder.\n\n${summary}\n\nWhat are we building today?`,
        },
      ]);
    }
  }, [habits.loaded]);

  // Sync panel state to habits when it changes
  useEffect(() => {
    if (habits.loaded) {
      habits.trackPanelState(shangCollapsed, explorerCollapsed);
    }
  }, [shangCollapsed, explorerCollapsed, habits.loaded]);

  // Sync view mode to habits
  useEffect(() => {
    if (habits.loaded) {
      habits.trackViewMode(viewMode);
    }
  }, [viewMode, habits.loaded]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shangMessages]);

  // Sort chips by usage habits
  const sortedChips = habits.sortChipsByHabits(FORGE_CHIPS);
  const visibleChips = showAllChips ? sortedChips : sortedChips.slice(0, 4);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/forge-api`, {
        method: "POST", headers: { Accept: "application/json" },
      });
      const data = await readForgeResponse(res);
      if (!res.ok) throw new Error(data.error || "Failed");
      setFiles(data.files || []);
      setSelectedFile(data.files?.[0] || null);
      setPreviewKey((k) => k + 1);
      setViewMode("preview");
      habits.trackViewMode("preview");
      setNotice({ type: "success", text: `Generated ${data.filesGenerated ?? data.files?.length} files.` });
      setShangMessages((prev) => [...prev, {
        role: "assistant",
        message: `${data.filesGenerated ?? data.files?.length} files generated. What would you like to change?`,
      }]);
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

  async function handleShangSend(messageText?: string) {
    const txt = messageText || shangInput.trim();
    if (!txt || shangThinking) return;

    // Track chip usage for habit learning
    if (messageText) {
      habits.trackChipUsed(messageText);
    }

    setShangInput("");
    setShangMessages((prev) => [...prev, { role: "user", message: txt }]);
    setShangThinking(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/forge-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: txt }),
      });
      const data = await res.json();
      setShangMessages((prev) => [...prev, {
        role: "assistant",
        message: data.reply || "Could not process that.",
      }]);
      if (data.updatedFiles?.length > 0) {
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
        setShangMessages((prev) => [...prev, {
          role: "assistant",
          message: `✅ ${data.filesChanged} file${data.filesChanged === 1 ? "" : "s"} updated. Preview refreshed.`,
        }]);
      }
    } catch {
      setShangMessages((prev) => [...prev, {
        role: "assistant", message: "Connection error. Please try again.",
      }]);
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

  const hasFiles = files.length > 0;

  // Habit indicator badge
  const showHabitBadge = habits.totalSessions >= 3;

  // Full Screen Mode
  if (isFullScreen) {
    return (
      <div className="relative h-full w-full">
        <iframe
          key={previewKey}
          src={`/api/projects/${projectId}/preview`}
          className="h-full w-full border-0 bg-white"
          title="Live Preview Full Screen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-modals"
        />
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

      {/* SHANG TSUNG PANEL */}
      {!shangCollapsed ? (
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-stone-800 bg-stone-900">
          <div className="border-b border-stone-800 bg-stone-950 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  🥋 Shang Tsung
                </p>
                {showHabitBadge && (
                  <span className="text-xs bg-orange-900/40 border border-orange-800/50 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                    Learned
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {showHabitBadge
                  ? `Session #${habits.totalSessions} · Habits active`
                  : "Code Editor"}
              </p>
            </div>
            <button type="button" onClick={() => setShangCollapsed(true)}
              className="rounded-lg border border-stone-700 hover:bg-stone-800 px-2 py-1 text-xs text-stone-400 hover:text-stone-100 transition">
              ◀
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
            {shangMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-orange-700 text-white rounded-br-none"
                    : "bg-stone-800 text-stone-200 rounded-bl-none"
                }`}>
                  {msg.role === "assistant" && (
                    <p className="text-xs text-orange-400 font-black mb-1">🥋 Shang Tsung</p>
                  )}
                  {msg.message}
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

          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-500 font-black uppercase tracking-wider">
                  Quick Commands
                </p>
                {showHabitBadge && (
                  <span className="text-xs text-orange-500" title="Sorted by your usage habits">
                    ↑ sorted
                  </span>
                )}
              </div>
              <button onClick={() => setShowAllChips(!showAllChips)}
                className="text-xs text-stone-500 hover:text-stone-300 transition">
                {showAllChips ? "Less" : "More"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleChips.map((chip, i) => {
                const usageCount = habits.session.chipUsage[chip.message]?.count || 0;
                return (
                  <button key={i}
                    onClick={() => handleShangSend(chip.message)}
                    disabled={shangThinking}
                    className={`flex items-center gap-1 rounded-lg border disabled:opacity-50 px-2 py-1.5 text-xs font-medium transition-all ${
                      usageCount > 2
                        ? "border-orange-800/60 bg-orange-900/20 text-orange-300 hover:border-orange-600 hover:bg-orange-900/30"
                        : "border-stone-700 bg-stone-950 text-stone-300 hover:border-orange-700 hover:bg-stone-800 hover:text-stone-100"
                    }`}
                    title={usageCount > 0 ? `Used ${usageCount} time${usageCount !== 1 ? "s" : ""}` : undefined}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                    {usageCount > 2 && (
                      <span className="text-orange-500 text-xs ml-0.5">★</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-stone-800 p-3">
            <textarea
              value={shangInput}
              onChange={(e) => setShangInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleShangSend(); } }}
              rows={2}
              placeholder="Tell Shang Tsung what to change..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600 resize-none"
            />
            <button type="button" onClick={() => handleShangSend()}
              disabled={shangThinking || !shangInput.trim()}
              className="mt-1.5 w-full rounded-lg bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-3 py-2 text-sm font-black text-white transition">
              {shangThinking ? "Editing..." : "Send"}
            </button>
          </div>
        </aside>
      ) : (
        <div className="flex flex-col items-center border-r border-stone-800 bg-stone-900 w-10 shrink-0">
          <button type="button" onClick={() => setShangCollapsed(false)}
            className="w-full flex flex-col items-center gap-1 py-3 hover:bg-stone-800 transition group"
            title="Expand Shang Tsung">
            <span className="text-base">🥋</span>
            <span className="text-stone-600 group-hover:text-orange-400 transition text-xs">▶</span>
          </button>
        </div>
      )}

      {/* FILE EXPLORER PANEL */}
      {!explorerCollapsed ? (
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-stone-800 bg-stone-900">
          <div className="p-3 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-stone-500 font-black">Files</p>
              <p className="text-xs text-stone-600 truncate">{projectName}</p>
            </div>
            <button type="button" onClick={() => setExplorerCollapsed(true)}
              className="rounded-lg border border-stone-700 hover:bg-stone-800 px-2 py-1 text-xs text-stone-400 hover:text-stone-100 transition">
              ◀
            </button>
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
                notice.type === "success"
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"
              }`}>
                {notice.text}
              </div>
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
                  const isFavorite = openCount >= 3;
                  return (
                    <li key={f.id}>
                      <button type="button"
                        onClick={() => handleFileSelect(f)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition ${
                          selectedFile?.id === f.id && viewMode === "code"
                            ? "bg-orange-900/40 border border-orange-800/50 text-orange-300"
                            : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                        }`}>
                        <span className="shrink-0 text-xs">{getFileIcon(f.file_path)}</span>
                        <span className="truncate font-mono text-xs flex-1">{f.file_path}</span>
                        {isFavorite && (
                          <span className="text-orange-500 text-xs shrink-0" title={`Opened ${openCount} times`}>★</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-800 p-2 text-center text-xs text-stone-600">
            {files.length} file{files.length !== 1 ? "s" : ""}
            {showHabitBadge && (
              <span className="ml-2 text-orange-600">· habits on</span>
            )}
          </div>
        </aside>
      ) : (
        <div className="flex flex-col items-center border-r border-stone-800 bg-stone-900 w-10 shrink-0">
          <button type="button" onClick={() => setExplorerCollapsed(false)}
            className="w-full flex flex-col items-center gap-1 py-3 hover:bg-stone-800 transition group"
            title="Expand File Explorer">
            <span className="text-base">📁</span>
            <span className="text-stone-600 group-hover:text-stone-100 transition text-xs">▶</span>
          </button>
        </div>
      )}

      {/* MAIN AREA */}
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
                <span className="truncate font-mono text-xs text-stone-500 max-w-[180px]">
                  {selectedFile.file_path}
                </span>
                <button type="button" onClick={handleCopyFile}
                  className="border border-stone-700 hover:border-stone-500 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </>
            )}
            {viewMode === "preview" && hasFiles && (
              <button type="button" onClick={() => setPreviewKey((k) => k + 1)}
                className="border border-stone-700 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:bg-stone-800 transition">
                🔄 Refresh
              </button>
            )}
            {hasFiles && viewMode === "preview" && (
              <button type="button" onClick={() => setIsFullScreen(true)}
                className="border border-stone-700 hover:border-orange-700 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">
                ⛶ Full Screen
              </button>
            )}
            <button type="button"
              onClick={() => { setShangCollapsed(true); setExplorerCollapsed(true); }}
              className="border border-stone-700 hover:border-stone-500 bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-100 transition">
              ⊞ Maximize
            </button>
            {(shangCollapsed || explorerCollapsed) && (
              <button type="button"
                onClick={() => { setShangCollapsed(false); setExplorerCollapsed(false); }}
                className="border border-orange-800/50 bg-orange-900/20 hover:bg-orange-900/30 px-2.5 py-1.5 rounded-lg text-xs text-orange-400 hover:text-orange-300 transition">
                ⊟ Restore
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === "preview" ? (
            hasFiles ? (
              <iframe
                key={previewKey}
                src={`/api/projects/${projectId}/preview`}
                className="h-full w-full border-0 bg-white"
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-modals"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center px-6">
                <div>
                  <p className="text-lg text-stone-500 mb-2">No Preview Yet</p>
                  <p className="text-sm text-stone-600">Click Generate Code to build your app.</p>
                </div>
              </div>
            )
          ) : selectedFile ? (
            <CodeViewer
              code={selectedFile.content}
              language={selectedFile.language}
              filePath={selectedFile.file_path}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 text-sm">
              Select a file to view its code.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}