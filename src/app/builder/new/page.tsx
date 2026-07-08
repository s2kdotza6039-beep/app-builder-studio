"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [appType, setAppType] = useState("Business App");
  const [complexity, setComplexity] = useState("Simple MVP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (idea.length < 10) {
      setError("Please describe your app idea in at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, appType, complexity }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          App Builder Studio
        </p>
        <h1 className="text-4xl font-bold">Start a new project</h1>
        <p className="mt-3 text-slate-300">
          Describe your app idea. Our AI will turn it into a full app plan.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          {/* Idea */}
          <div>
            <label className="block text-sm font-semibold text-slate-300">
              Describe your app idea
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={5}
              placeholder="e.g. An app that helps local musicians sell beats directly to content creators, with a built-in marketplace and royalty splitter."
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none"
            />
          </div>

          {/* App Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-300">
              App type
            </label>
            <select
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-slate-500 focus:outline-none"
            >
              <option>Business App</option>
              <option>Marketplace</option>
              <option>Booking App</option>
              <option>Music App</option>
              <option>Dashboard</option>
              <option>E-commerce App</option>
              <option>AI Assistant App</option>
              <option>Education App</option>
              <option>Finance App</option>
              <option>Health/Fitness App</option>
              <option>Community App</option>
              <option>Custom App</option>
            </select>
          </div>

          {/* Complexity */}
          <div>
            <label className="block text-sm font-semibold text-slate-300">
              Complexity
            </label>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-slate-500 focus:outline-none"
            >
              <option>Simple MVP</option>
              <option>Standard App</option>
              <option>Advanced Platform</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? "Generating your app plan..." : "Generate App Plan"}
          </button>
        </div>
      </div>
    </main>
  );
}