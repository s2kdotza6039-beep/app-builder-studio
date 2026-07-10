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
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/forge`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setSelectedFile(data.files[0]);
        setMessage(`✅ Generated ${data.filesGenerated} files`);
      } else {
        const errData = await res.json();
        setMessage("❌ " + (errData.error || "Failed to generate code"));
      }
    } catch (err) {
      setMessage("❌ Error generating code");
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const getFileIcon = (filePath: string): string => {
    if (filePath.endsWith(".tsx")) return "📄";
    if (filePath.endsWith(".ts")) return "📘";
    if (filePath.endsWith(".json")) return "📋";
    if (filePath.endsWith(".md")) return "📝";
    if (filePath.endsWith(".css")) return "🎨";
    return "📎";
  };

  return (
    <div className="flex h-full">
      {/* LEFT PANEL: File Explorer */}
      <aside className="w-[280px] border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
            File Explorer
          </h2>
        </div>

        <div className="p-3 border-b border-slate-800">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2.5 text-sm font-semibold transition"
          >
            {generating ? "⚙️ Generating..." : "🔨 Generate Code"}
          </button>
          {message && (
            <p className={`mt-2 text-xs text-center ${message.startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-500 mb-2">No files yet.</p>
              <p className="text-xs text-slate-600">
                Click "Generate Code" to transform your plan into actual code.
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                      selectedFile?.id === file.id
                        ? "bg-orange-900/40 text-orange-300 border border-orange-800"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{getFileIcon(file.file_path)}</span>
                    <span className="font-mono text-xs truncate">{file.file_path}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 text-xs text-slate-600 text-center">
          {files.length} file{files.length !== 1 ? "s" : ""} generated
        </div>
      </aside>

      {/* MIDDLE PANEL: Code Viewer */}
      <section className="flex-1 flex flex-col bg-slate-950 min-w-0">
        <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedFile && <span>{getFileIcon(selectedFile.file_path)}</span>}
            <p className="text-sm font-mono text-slate-400">
              {selectedFile?.file_path || "No file selected"}
            </p>
          </div>
          {selectedFile && (
            <span className="text-xs text-slate-600 px-2 py-0.5 rounded bg-slate-800">
              {selectedFile.language}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <div className="p-6">
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-slate-500 text-lg mb-2">No file selected</p>
                <p className="text-slate-600 text-sm">
                  {files.length > 0
                    ? "Click a file on the left to view its code"
                    : "Click 'Generate Code' to start building"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT PANEL: Live Preview */}
      <aside className="w-[400px] border-l border-slate-800 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-800 bg-slate-950">
          <h2 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
            Live Preview
          </h2>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-3">
          <div className="bg-white rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
            {/* Browser Chrome */}
            <div className="border-b border-slate-200 px-4 py-2 flex items-center gap-3 bg-slate-50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded px-3 py-0.5 text-xs text-slate-400 text-center">
                {projectName.toLowerCase().replace(/\s+/g, "-")}.app
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-6">
              {files.length > 0 ? (
                <div>
                  <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg p-6 text-white mb-4">
                    <h1 className="text-2xl font-bold mb-2">{projectName}</h1>
                    <p className="text-slate-400 text-sm">Your app preview</p>
                  </div>
                  <div className="space-y-2">
                    {files
                      .filter((f) => f.file_path.includes("page.tsx"))
                      .map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-2 p-2 rounded border border-slate-200 text-xs text-slate-600 cursor-pointer hover:bg-slate-50"
                          onClick={() => setSelectedFile(f)}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          {f.file_path}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-slate-400 font-semibold mb-2">No Preview Yet</p>
                    <p className="text-slate-500 text-xs">
                      Generate code to see your app take shape
                    </p>
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