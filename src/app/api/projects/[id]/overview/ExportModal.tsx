"use client";

import { useState } from "react";

export default function ExportModal({ gamePlan }: { gamePlan: string }) {
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(gamePlan);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-xl bg-orange-600 px-6 py-3 font-semibold hover:bg-orange-500 transition"
      >
        Generate the Game Plan
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orange-400">Your Game Plan</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <textarea
              readOnly
              value={gamePlan}
              className="w-full h-80 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none resize-none font-mono"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition font-semibold"
              >
                {copySuccess ? "Copied! ✓" : "Copy to Clipboard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}