"use client";

import { useState } from "react";

export interface ViewerFile {
  file_path: string;
  content: string;
  language?: string;
}

export function CodeViewer({ files }: { files: ViewerFile[] }) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const file = files[selected];

  const copy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  if (!files.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No files generated yet.
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-950">
      {/* File tree */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-800 p-2 text-sm">
        <div className="mb-2 px-2 text-[10px] uppercase tracking-wider text-slate-500">
          Project Files
        </div>
        {files.map((f, i) => (
          <button
            key={f.file_path}
            onClick={() => setSelected(i)}
            title={f.file_path}
            className={`mb-0.5 block w-full truncate rounded px-2 py-1 text-left text-xs ${
              i === selected
                ? "bg-violet-600/25 text-violet-200"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            {f.file_path}
          </button>
        ))}
      </div>

      {/* Code */}
      <div className="relative flex-1 overflow-auto">
        <button
          onClick={copy}
          className="absolute right-3 top-3 z-10 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
        >
          {copied ? "✓ Copied" : "Copy File"}
        </button>
        <pre className="min-h-full whitespace-pre-wrap p-4 pt-12 text-xs leading-relaxed text-slate-200">
          {file?.content}
        </pre>
      </div>
    </div>
  );
}
