"use client";

import { useState } from "react";

export default function ExportModal({ gamePlan }: { gamePlan: string }) {
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(gamePlan);
    setCopySuccess(true);

    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-500"
      >
        Generate the Game Plan
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-orange-400">
                Your Game Plan
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-2xl leading-none text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <textarea
              readOnly
              value={gamePlan}
              className="h-80 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-200 focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 transition hover:bg-slate-800"
              >
                Close
              </button>

              <button
                onClick={handleCopy}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold transition hover:bg-emerald-500"
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