"use client";

import { useState } from "react";
import ShangTsung from "./ShangTsung";

export default function ShangTsungDrawer({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Collapsible Left Panel (Shang Tsung) */}
      <div
        className={`fixed top-[73px] left-0 h-[calc(100vh-73px)] z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="w-[380px] h-full border-r border-slate-800 bg-slate-900 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <h2 className="font-bold text-orange-400 flex items-center gap-2">
              <span>🥋</span> Shang Tsung
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-2xl leading-none px-2 py-1"
            >
              &times;
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ShangTsung projectId={projectId} embedded={true} />
          </div>
        </div>
      </div>

      {/* Floating Toggle Button (Appears when panel is closed or to toggle) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 font-semibold text-white shadow-2xl hover:bg-orange-500 transition"
      >
        <span>🥋</span>
        <span className="text-xs">{isOpen ? "Hide" : "Shang Tsung"}</span>
      </button>
    </>
  );
}