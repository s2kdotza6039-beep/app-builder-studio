"use client";

import { useEffect, useState, type ReactNode } from "react";
import ShangTsung from "./ShangTsung";

const STORAGE_KEY = "app-builder-studio:shang-tsung-panel";

export default function WorkspaceShell({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(STORAGE_KEY);

    if (savedPreference === "closed") {
      setIsPanelOpen(false);
    }
  }, []);

  function updatePanel(open: boolean) {
    setIsPanelOpen(open);

    window.localStorage.setItem(
      STORAGE_KEY,
      open ? "open" : "closed"
    );
  }

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (event.key === "Escape" && isPanelOpen) {
        updatePanel(false);
      }

      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        updatePanel(!isPanelOpen);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [isPanelOpen]);

  return (
    <div className="relative flex h-[calc(100vh-73px)] overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {isPanelOpen && (
        <button
          type="button"
          aria-label="Close Shang Tsung panel"
          onClick={() => updatePanel(false)}
          className="absolute inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      {/* Sliding Shang Tsung panel */}
      <aside
        className={[
          "absolute inset-y-0 left-0 z-40 shrink-0 overflow-hidden border-r border-slate-800 bg-slate-900",
          "transition-[transform,width] duration-300 ease-in-out",
          "lg:relative lg:z-20 lg:translate-x-0",
          isPanelOpen
            ? "w-[min(92vw,420px)] translate-x-0 lg:w-[38%] lg:min-w-[340px] lg:max-w-[580px]"
            : "w-[min(92vw,420px)] -translate-x-full lg:w-0 lg:min-w-0 lg:border-r-0",
        ].join(" ")}
      >
        <div className="flex h-full w-[min(92vw,420px)] min-w-0 flex-col lg:w-full lg:min-w-[340px]">
          {/* Assistant header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-orange-400">
                <span aria-hidden="true">🥋</span>
                Shang Tsung
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Game Plan Architect
              </p>
            </div>

            <button
              type="button"
              onClick={() => updatePanel(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              title="Hide assistant"
            >
              Hide
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <ShangTsung projectId={projectId} />
          </div>
        </div>
      </aside>

      {/* Full-width preview workspace */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-950">
        {/* Preview toolbar */}
        <div className="flex min-h-12 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex items-center gap-3">
            {!isPanelOpen && (
              <button
                type="button"
                onClick={() => updatePanel(true)}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-500"
              >
                Open Shang Tsung
              </button>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Architecture Preview
            </div>
          </div>

          <div className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">
            <span>
              {isPanelOpen ? "Split View" : "Full Preview"}
            </span>

            <span className="rounded-md border border-slate-700 px-2 py-1">
              Alt + S
            </span>
          </div>
        </div>

        {/* Preview content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </section>
    </div>
  );
}