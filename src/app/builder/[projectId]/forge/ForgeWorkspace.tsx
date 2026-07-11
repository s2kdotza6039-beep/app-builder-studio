"use client";

import { useState, useEffect } from "react";
import ShangTsung from "./ShangTsung";

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
  const [notice, setNotice] = useState<string>("");
  const [previewKey, setPreviewKey] = useState(0);
  const [showShangTsung, setShowShangTsung] = useState(true);

  const handleGenerate = async () => {
    setGenerating(true);
    setNotice("");

    try {
      const res = await fetch(`/api/projects/${projectId}/forge-api`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      setFiles(data.files || []);
      setSelectedFile((data.files || [])[0] || null);
      setPreviewKey((k) => k + 1);
      setNotice(`Generated ${data.filesGenerated || 0} files successfully.`);
    } catch (err: any) {
      setNotice("Error: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (downloading || files.length === 0) return;

    setDownloading(true);
    setNotice("");

    try {
      const res = await fetch(`/api/projects/${projectId}/download-api`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setNotice("Project downloaded successfully.");
    } catch (err: any) {
      setNotice("Download error: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950">
      {/* LEFT: Shang Tsung Panel (Collapsible) */}
      <div
        className={`border-r border-slate-800 bg-slate-900 transition-all duration-300 flex flex-col ${
          showShangTsung ? "w-96" : "w-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="font-bold text-orange-400 flex items-center gap-2">
            <span>🥋</span> Shang Tsung
          </div>
          <button
            onClick={() => setShowShangTsung(!showShangTsung)}
            className="text-slate-400 hover:text-white text-xl"
          >
            {showShangTsung ? "→" : "←"}
          </button>
        </div>

        {showShangTsung && (
          <div className="flex-1 overflow-hidden">
            <ShangTsung projectId={projectId} />
          </div>
        )}
      </div>

      {/* RIGHT: Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-12 border-b border-slate-800 bg-slate-900 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowShangTsung(!showShangTsung)}
              className="text-sm text-slate-400 hover:text-white"
            >
              {showShangTsung ? "Hide Shang Tsung" : "Show Shang Tsung"}
            </button>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-sm font-medium">{projectName}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Code"}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || files.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {downloading ? "Downloading..." : "Download ZIP"}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer */}
          <div className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <p className="uppercase text-xs tracking-widest text-slate-500 font-semibold">Files</p>
            </div>

            {files.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No files yet.<br />Click "Generate Code"
              </div>
            ) : (
              <div className="p-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 transition ${
                      selectedFile?.id === file.id
                        ? "bg-orange-900 text-orange-200"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {file.file_path}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Code / Preview Area */}
          <div className="flex-1 flex flex-col">
            {selectedFile ? (
              <div className="flex-1 overflow-auto p-6 font-mono text-sm bg-slate-950 text-slate-200 whitespace-pre-wrap">
                {selectedFile.content}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Select a file from the explorer
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="w-2/5 border-l border-slate-800 bg-white overflow-hidden flex flex-col">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>Live Preview — {projectName}</span>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="text-[10px] text-blue-600 hover:text-blue-700"
              >
                REFRESH
              </button>
            </div>

            <iframe
              key={previewKey}
              src={`/api/projects/${projectId}/preview`}
              className="flex-1 border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              title="Live Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}