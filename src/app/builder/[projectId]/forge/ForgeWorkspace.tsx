"use client";

import { useState, useRef, useEffect } from "react";

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
}

interface SuggestionChip {
  label: string;
  message: string;
  icon: string;
}

const FORGE_CHIPS: SuggestionChip[] = [
  { icon: "🎨", label: "Hero orange", message: "Change the hero color to orange" },
  { icon: "💚", label: "Button green", message: "Make the button green" },
  { icon: "💰", label: "Add pricing", message: "Add a pricing section" },
  { icon: "⭐", label: "Add testimonials", message: "Add a testimonials section" },
  { icon: "❓", label: "Add FAQ", message: "Add a FAQ section" },
  { icon: "📏", label: "Bigger heading", message: "Make the heading larger" },
  { icon: "🌑", label: "Darker background", message: "Make the background darker" },
  { icon: "📋", label: "What files?", message: "What files exist?" },
  { icon: "🔵", label: "Hero blue", message: "Change the hero color to blue" },
  { icon: "🟣", label: "Hero purple", message: "Change the hero color to purple" },
  { icon: "🚫", label: "Hide nav", message: "Hide the navigation" },
  { icon: "❓", label: "What can you do?", message: "What can you do?" },
];

async function readForgeResponse(response: Response): Promise<ForgeResponse> {
  const text = await response.text();
  if (!text) throw new Error(`Empty response. HTTP ${response.status}`);
  try { return JSON.parse(text) as ForgeResponse; }
  catch { throw new Error(`HTML error returned. HTTP ${response.status}`); }
}

function createDownloadName(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "my-app"}.zip`;
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
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles || []);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(initialFiles?.[0] || null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  // Shang Tsung Chat
  const [shangMessages, setShangMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      message: "I am Shang Tsung — your Code Editor.\n\nTap a suggestion or tell me what to change in the code.",
    },
  ]);
  const [shangInput, setShangInput] = useState("");
  const [shangThinking, setShangThinking] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [shangMessages]);

  const visibleChips = showAllChips ? FORGE_CHIPS : FORGE_CHIPS.slice(0, 4);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/forge-api`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await readForgeResponse(res);
      if (!res.ok) throw new Error(data.error || `Failed ${res.status}`);
      setFiles(data.files || []);
      setSelectedFile(data.files?.[0] || null);
      setPreviewKey((k) => k + 1);
      setViewMode("preview");
      setNotice({ type: "success", text: `Generated ${data.filesGenerated ?? data.files?.length} files.` });

      setShangMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: `${data.filesGenerated ?? data.files?.length} files generated. I am ready to edit them. What would you like to change?`,
        },
      ]);
    } catch (e: any) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (downloading || !files.length) return;
    setDownloading(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/download-api`, { method: "GET" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = createDownloadName(projectName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: "success", text: "Downloaded successfully." });
    } catch (e: any) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setDownloading(false);
    }
  }

  async function handleShangSend(messageText?: string) {
    const textToSend = messageText || shangInput.trim();
    if (!textToSend || shangThinking) return;

    setShangInput("");
    setShangMessages((prev) => [...prev, { role: "user", message: textToSend }]);
    setShangThinking(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/forge-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      setShangMessages((prev) => [
        ...prev,
        { role: "assistant", message: data.reply || "Could not process that." },
      ]);

      if (data.updatedFiles && data.updatedFiles.length > 0) {
        setFiles((prevFiles) =>
          prevFiles.map((f) => {
            const updated = data.updatedFiles.find(
              (u: { id: string; content: string }) => u.id === f.id
            );
            return updated ? { ...f, content: updated.content } : f;
          })
        );

        setSelectedFile((prev) => {
          if (!prev) return prev;
          const updated = data.updatedFiles.find(
            (u: { id: string }) => u.id === prev.id
          );
          return updated ? { ...prev, content: updated.content } : prev;
        });

        setPreviewKey((k) => k + 1);

        setShangMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            message: `✅ ${data.filesChanged} file${data.filesChanged === 1 ? "" : "s"} updated. Preview refreshed.`,
          },
        ]);
      }
    } catch {
      setShangMessages((prev) => [
        ...prev,
        { role: "assistant", message: "Connection error. Please try again." },
      ]);
    } finally {
      setShangThinking(false);
    }
  }

  function getIcon(path: string) {
    if (path.endsWith(".tsx")) return "📄";
    if (path.endsWith(".json")) return "📋";
    if (path.endsWith(".md")) return "📝";
    return "📎";
  }

  const hasFiles = files.length > 0;

  return (
    <div className="flex h-full min-h-0">

      {/* LEFT: Shang Tsung Code Editor */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
            🥋 Shang Tsung
          </p>
          <h2 className="mt-1 text-sm font-bold text-white">Code Editor</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tap a suggestion or type a command
          </p>
        </div>

        {/* Chat Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
          {shangMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-orange-600 text-white rounded-br-none"
                    : "bg-slate-800 text-slate-200 rounded-bl-none"
                }`}
              >
                {msg.role === "assistant" && (
                  <p className="text-xs text-orange-400 font-bold mb-1">
                    🥋 Shang Tsung
                  </p>
                )}
                {msg.message}
              </div>
            </div>
          ))}

          {shangThinking && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-3 py-2.5 text-sm italic">
                Editing code...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Quick Commands
            </p>
            <button
              onClick={() => setShowAllChips(!showAllChips)}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              {showAllChips ? "Less" : "More"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visibleChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleShangSend(chip.message)}
                disabled={shangThinking}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 hover:border-orange-600 hover:bg-slate-800 disabled:opacity-50 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-3">
          <textarea
            value={shangInput}
            onChange={(e) => setShangInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleShangSend();
              }
            }}
            rows={3}
            placeholder="Tell Shang Tsung what to change..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
          />
          <button
            type="button"
            onClick={() => handleShangSend()}
            disabled={shangThinking || !shangInput.trim()}
            className="mt-2 w-full rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-3 py-2 text-sm font-semibold transition"
          >
            {shangThinking ? "Editing..." : "Send"}
          </button>
        </div>
      </aside>

      {/* MIDDLE: File Explorer */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <p className="text-xs uppercase text-slate-500 font-bold">
            File Explorer
          </p>
          <h2 className="text-sm font-bold text-white truncate mt-1">
            {projectName}
          </h2>
        </div>

        <div className="p-3 border-b border-slate-800 space-y-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl py-3 text-sm font-semibold transition"
          >
            {generating ? "Generating..." : "🔨 Generate Code"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !hasFiles}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl py-3 text-sm font-semibold transition"
          >
            {downloading ? "Preparing..." : "📦 Download Project"}
          </button>

          {notice && (
            <div
              className={`border rounded-lg p-3 text-xs ${
                notice.type === "success"
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"
              }`}
            >
              {notice.text}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!hasFiles ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center mt-2">
              <p className="text-sm text-slate-500">No files yet.</p>
              <p className="mt-1 text-xs text-slate-600">
                Click Generate Code to start.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(f);
                      setViewMode("code");
                    }}
                    className={`w-full text-left flex gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      selectedFile?.id === f.id && viewMode === "code"
                        ? "bg-orange-900/40 border border-orange-800 text-orange-300"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{getIcon(f.file_path)}</span>
                    <span className="truncate font-mono text-xs">
                      {f.file_path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-800 p-3 text-center text-xs text-slate-600">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </div>
      </aside>

      {/* RIGHT: Preview or Code */}
      <section className="flex flex-1 min-w-0 flex-col bg-slate-950">
        <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "preview"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              👁 Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "code"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {"</>"} Code
            </button>
          </div>

          {viewMode === "preview" && hasFiles && (
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
            >
              🔄 Refresh
            </button>
          )}

          {viewMode === "code" && selectedFile && (
            <span className="truncate font-mono text-xs text-slate-500">
              {selectedFile.file_path}
            </span>
          )}
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
                  <p className="text-lg text-slate-500 mb-2">No Preview Yet</p>
                  <p className="text-sm text-slate-600">
                    Click Generate Code to build your app.
                  </p>
                </div>
              </div>
            )
          ) : selectedFile ? (
            <div className="h-full overflow-auto p-6">
              <pre className="whitespace-pre-wrap break-words bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm text-slate-300 font-mono leading-6">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
              Select a file to view its code.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}