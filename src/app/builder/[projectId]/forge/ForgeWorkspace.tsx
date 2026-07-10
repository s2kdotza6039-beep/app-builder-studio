"use client";

import { useState } from "react";

interface ProjectFile {
  id: string;
  project_id: string;
  file_path: string;
  content: string;
  language: string;
  created_at: string | Date;
  updated_at: string | Date;
}

interface ForgeResponse {
  success?: boolean;
  filesGenerated?: number;
  files?: ProjectFile[];
  error?: string;
}

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

async function readForgeResponse(
  response: Response
): Promise<ForgeResponse> {
  const responseText = await response.text();

  if (!responseText) {
    throw new Error(
      `The Forge returned an empty response. HTTP status: ${response.status}.`
    );
  }

  try {
    return JSON.parse(responseText) as ForgeResponse;
  } catch {
    console.error("Non-JSON Forge response:", responseText);
    throw new Error(
      `The Forge returned HTML instead of JSON. HTTP status: ${response.status}.`
    );
  }
}

function createDownloadName(projectName: string) {
  const safeName = projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeName || "my-app"}.zip`;
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
  const [files, setFiles] = useState<ProjectFile[]>(
    initialFiles || []
  );
  const [selectedFile, setSelectedFile] =
    useState<ProjectFile | null>(initialFiles?.[0] || null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<"preview" | "code">(
    "preview"
  );

  async function handleGenerate() {
    if (generating) return;

    setGenerating(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/forge-api`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        }
      );

      const data = await readForgeResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Code generation failed with HTTP status ${response.status}.`
        );
      }

      if (!Array.isArray(data.files)) {
        throw new Error(
          "The Forge did not return a valid file list."
        );
      }

      setFiles(data.files);
      setSelectedFile(data.files[0] || null);
      setPreviewKey((k) => k + 1); // refresh the live preview
      setViewMode("preview");

      setNotice({
        type: "success",
        text: `Generated ${
          data.filesGenerated ?? data.files.length
        } files successfully.`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Code generation failed.";
      console.error("Forge generation error:", error);
      setNotice({ type: "error", text: errorMessage });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (downloading || files.length === 0) return;

    setDownloading(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/download`,
        {
          method: "GET",
          headers: { Accept: "application/zip" },
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = "Project download failed.";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (responseText) {
            console.error("Non-JSON download error:", responseText);
          }
        }
        throw new Error(errorMessage);
      }

      const zipBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = createDownloadName(projectName);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setNotice({
        type: "success",
        text: "Project downloaded successfully.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Project download failed.";
      console.error("Download error:", error);
      setNotice({ type: "error", text: errorMessage });
    } finally {
      setDownloading(false);
    }
  }

  function getFileIcon(filePath: string) {
    if (filePath.endsWith(".tsx")) return "📄";
    if (filePath.endsWith(".ts")) return "📘";
    if (filePath.endsWith(".json")) return "📋";
    if (filePath.endsWith(".md")) return "📝";
    if (filePath.endsWith(".css")) return "🎨";
    return "📎";
  }

  const hasFiles = files.length > 0;

  return (
    <div className="flex h-full min-h-0">
      {/* File Explorer */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            File Explorer
          </p>
          <h2 className="mt-1 truncate text-sm font-bold text-white">
            {projectName}
          </h2>
        </div>

        <div className="space-y-2 border-b border-slate-800 p-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating Code..." : "🔨 Generate Code"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !hasFiles}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {downloading ? "Preparing ZIP..." : "📦 Download Project"}
          </button>

          {notice && (
            <div
              className={[
                "rounded-lg border p-3 text-xs",
                notice.type === "success"
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300",
              ].join(" ")}
            >
              {notice.text}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!hasFiles ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center">
              <p className="text-sm text-slate-500">
                No generated files.
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Generate the approved project plan.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(file);
                      setViewMode("code");
                    }}
                    className={[
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                      selectedFile?.id === file.id &&
                      viewMode === "code"
                        ? "border border-orange-800 bg-orange-950/40 text-orange-300"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    ].join(" ")}
                  >
                    <span>{getFileIcon(file.file_path)}</span>
                    <span className="truncate font-mono text-xs">
                      {file.file_path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-800 p-3 text-center text-xs text-slate-600">
          {files.length} generated{" "}
          {files.length === 1 ? "file" : "files"}
        </div>
      </aside>

      {/* Main Area: Preview or Code */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-950">
        {/* Toggle Bar */}
        <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={[
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition",
                viewMode === "preview"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              👁 Live Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={[
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition",
                viewMode === "code"
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              {"</>"} Code
            </button>
          </div>

          {viewMode === "preview" && hasFiles && (
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {viewMode === "preview" ? (
            hasFiles ? (
              <iframe
                key={previewKey}
                src={`/api/projects/${projectId}/preview`}
                title="Live Preview"
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <p className="mb-2 text-lg text-slate-500">
                    No Preview Yet
                  </p>
                  <p className="text-sm text-slate-600">
                    Click Generate Code to build your app,
                    then see it live here.
                  </p>
                </div>
              </div>
            )
          ) : selectedFile ? (
            <div className="h-full overflow-auto p-6">
              <pre className="whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-900 p-5 font-mono text-sm leading-6 text-slate-300">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Select a file to view its code.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}