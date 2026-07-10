"use client";

import { useState } from "react";

interface ProjectFile {
  id: string;
  file_path: string;
  content: string;
  language: string;
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
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(
    initialFiles?.[0] || null
  );
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/forge-api`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid response"); }

      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (!Array.isArray(data.files)) throw new Error("No file list returned");

      setFiles(data.files);
      setSelectedFile(data.files[0] || null);
      setMessage(`Generated ${data.filesGenerated ?? data.files.length} files successfully.`);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (downloading || files.length === 0) return;
    setDownloading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/download-api`, { method: "GET" });
      if (!res.ok) {
        let msg = "Download failed";
        try { const e = await res.json(); msg = e.error || msg; } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Project downloaded successfully.");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith(".tsx")) return "📄";
    if (path.endsWith(".ts")) return "📘";
    if (path.endsWith(".json")) return "📋";
    if (path.endsWith(".md")) return "📝";
    if (path.endsWith(".css")) return "🎨";
    return "📎";
  };

  return (
    <div className="flex h-full">
      {/* LEFT: File Explorer */}
      <aside className="w-[280px] flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">File Explorer</h2>
        </div>
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button onClick={handleGenerate} disabled={generating}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {generating ? "⚙️ Generating..." : "🔨 Generate Code"}
          </button>
          <button onClick={handleDownload} disabled={downloading || files.length === 0}
            className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
            {downloading ? "📦 Preparing..." : "📦 Download Project"}
          </button>
          {message && (
            <div className={`rounded-lg border p-3 text-xs ${message.toLowerCase().includes("success") ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>
              {message}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No files yet.</div>
          ) : (
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.id}>
                  <button onClick={() => setSelectedFile(f)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${selectedFile?.id === f.id ? "border border-orange-800 bg-orange-900/40 text-orange-300" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                    <span>{getFileIcon(f.file_path)}</span>
                    <span className="truncate font-mono text-xs">{f.file_path}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3 border-t border-slate-800 text-xs text-slate-600 text-center">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </div>
      </aside>

      {/* MIDDLE: Code Viewer */}
      <section className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <p className="font-mono text-sm text-slate-400 truncate">{selectedFile?.file_path || "No file selected"}</p>
          {selectedFile && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{selectedFile.language}</span>}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {selectedFile ? (
            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap"><code>{selectedFile.content}</code></pre>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">Select a file to view</div>
          )}
        </div>
      </section>

      {/* RIGHT: Preview */}
      <aside className="w-[400px] flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-3 border-b border-slate-800 bg-slate-950">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Preview</h2>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-3">
          <div className="bg-white rounded-lg shadow-xl h-full flex flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-2 bg-slate-50 rounded-t-lg">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 text-center text-xs text-slate-400">{projectName.toLowerCase().replace(/\s+/g, "-")}.app</div>
            </div>
            <div className="flex-1 p-6">
              {files.length > 0 ? (
                <div>
                  <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-6 text-white mb-5">
                    <h1 className="text-2xl font-bold">{projectName}</h1>
                    <p className="text-sm text-slate-400 mt-2">{files.length} files ready</p>
                  </div>
                  <button onClick={handleDownload} disabled={downloading}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 mb-4 disabled:opacity-50">
                    {downloading ? "Preparing..." : "📦 Download Project as ZIP"}
                  </button>
                  <p className="text-sm font-semibold mb-3">Generated Pages</p>
                  <div className="space-y-2">
                    {files.filter((f) => f.file_path.endsWith("page.tsx")).map((f) => (
                      <button key={f.id} onClick={() => setSelectedFile(f)}
                        className="flex w-full items-center gap-2 rounded-lg border p-2 text-xs text-slate-600 hover:bg-slate-50">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {f.file_path}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-center">
                  <div>
                    <p className="font-semibold mb-2">No Preview Yet</p>
                    <p className="text-xs text-slate-500">Generate code to see your app</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}