"use client";
import { useState } from "react";

export default function GamePlanButton({ projectId }: { projectId: string }) {
  const [gamePlan, setGamePlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`);
      const data = await res.json();
      setGamePlan(data.gamePlan);
    } catch (err) {
      console.error("Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl bg-orange-600 px-6 py-3 font-semibold hover:bg-orange-500 transition disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate the Game Plan"}
      </button>

      {gamePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 p-8 text-white shadow-2xl">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">Game Plan</h2>
              <button
                onClick={() => setGamePlan(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap text-sm text-slate-300 max-h-96">
              {gamePlan}
            </pre>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gamePlan);
                  alert("Game Plan copied to clipboard!");
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setGamePlan(null)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}