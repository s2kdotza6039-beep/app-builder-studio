"use client";

import { useState } from "react";

interface ProjectFile {
  id: string;
  project_id: string;
  file_path: string;
  content: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

interface ForgeResponse {
  success?: boolean;
  filesGenerated?: number;
  files?: ProjectFile[];
  error?: string;
}

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
      `The Forge returned an HTML error page instead of JSON. HTTP status: ${response.status}. Check the VS Code terminal for the server error.`
    );
  }
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
    useState<ProjectFile | null>(
      initialFiles?.[0] || null
    );

  const [generating, setGenerating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const handleGenerate = async () => {
    if (generating) {
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      // ✅ CHANGED: Point directly to /forge-api
      const response = await fetch(
        `/api/projects/${projectId}/forge-api`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
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

      setMessage(
        `Generated ${data.filesGenerated ?? data.files.length} files successfully.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Code generation failed.";

      console.error("Forge generation error:", error);

      setMessage(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith(".tsx")) {
      return "📄";
    }

    if (filePath.endsWith(".ts")) {
      return "📘";
    }

    if (filePath.endsWith(".json")) {
      return "📋";
    }

    if (filePath.endsWith(".md")) {
      return "📝";
    }

    if (filePath.endsWith(".css")) {
      return "🎨";
    }

    return "📎";
  };

  return (
    <div className="flex h-full">
      {/* File explorer */}
      <aside className="flex w-[280px] flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 bg-slate-950 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            File Explorer
          </h2>
        </div>

        <div className="border-b border-slate-800 p-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Generating Code..."
              : "🔨 Generate Code"}
          </button>

          {message && (
            <div
              className={`mt-3 rounded-lg border p-3 text-xs ${
                message.toLowerCase().includes("success")
                  ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                  : "border-red-800 bg-red-950/40 text-red-300"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="p-4 text-center">
              <p className="mb-2 text-sm text-slate-500">
                No files generated.
              </p>

              <p className="text-xs text-slate-600">
                Generate code to transform the approved plan into application files.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFile(file)
                    }
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedFile?.id === file.id
                        ? "border border-orange-800 bg-orange-950/40 text-orange-300"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>
                      {getFileIcon(file.file_path)}
                    </span>

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

      {/* Code viewer */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-3">
          <div className="flex min-w-0 items-center gap-2">
            {selectedFile && (
              <span>
                {getFileIcon(
                  selectedFile.file_path
                )}
              </span>
            )}

            <p className="truncate font-mono text-sm text-slate-400">
              {selectedFile?.file_path ||
                "No file selected"}
            </p>
          </div>

          {selectedFile && (
            <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-500">
              {selectedFile.language}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <pre className="min-h-full whitespace-pre-wrap p-6 font-mono text-sm leading-relaxed text-slate-300">
              <code>
                {selectedFile.content}
              </code>
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-lg text-slate-500">
                  No file selected
                </p>

                <p className="text-sm text-slate-600">
                  Generate code or select a file from the explorer.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Preview panel */}
      <aside className="flex w-[400px] flex-shrink-0 flex-col border-l border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 bg-slate-950 p-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Preview
          </h2>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-3">
          <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>

              <div className="flex-1 rounded border border-slate-200 bg-white px-3 py-1 text-center text-xs text-slate-400">
                {projectName
                  .toLowerCase()
                  .replace(/\s+/g, "-")}
                .app
              </div>
            </div>

            <div className="flex-1 p-6 text-slate-800">
              {files.length > 0 ? (
                <>
                  <div className="mb-5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-white">
                    <h1 className="text-2xl font-bold">
                      {projectName}
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                      Build files generated successfully.
                    </p>
                  </div>

                  <p className="mb-3 text-sm font-semibold">
                    Generated Pages
                  </p>

                  <div className="space-y-2">
                    {files
                      .filter((file) =>
                        file.file_path.endsWith(
                          "page.tsx"
                        )
                      )
                      .map((file) => (
                        <button
                          type="button"
                          key={file.id}
                          onClick={() =>
                            setSelectedFile(file)
                          }
                          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 p-2 text-left text-xs text-slate-600 transition hover:bg-slate-50"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />

                          <span className="truncate">
                            {file.file_path}
                          </span>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <p className="mb-2 font-semibold text-slate-400">
                      No Preview Yet
                    </p>

                    <p className="text-xs text-slate-500">
                      Generate the project files to begin Stage 2.
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