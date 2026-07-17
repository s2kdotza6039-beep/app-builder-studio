"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 bg-stone-900 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-100 transition">
          &larr; Dashboard
        </Link>
        <div className="h-5 w-px bg-stone-700" />
        <div>
          <h1 className="font-black text-stone-100">New Project</h1>
          <p className="text-xs text-stone-500">Describe your idea and let AI plan it</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-3xl font-black mb-2 text-stone-100">Start a New Project</h2>
          <p className="text-stone-400 text-sm">
            Describe your app idea below. Or use{" "}
            <Link href="/brain-dump" className="text-orange-400 hover:text-orange-300 font-bold transition">
              🧠 Brain Dump
            </Link>{" "}
            for a faster, smarter workflow.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900 p-8 space-y-6">
          {/* Idea */}
          <div>
            <label className="block text-sm font-black text-stone-300 mb-2">
              Describe your app idea
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={5}
              placeholder="e.g. An app that helps local musicians sell beats directly to content creators, with a built-in marketplace and royalty splitter."
              className="w-full rounded-xl border border-stone-700 bg-stone-950 p-4 text-sm text-stone-100 placeholder-stone-600 focus:border-orange-600 focus:outline-none resize-none"
            />
          </div>

          {/* App Type */}
          <div>
            <label className="block text-sm font-black text-stone-300 mb-2">App type</label>
            <select
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-950 p-3 text-sm text-stone-100 focus:border-orange-600 focus:outline-none"
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
            <label className="block text-sm font-black text-stone-300 mb-2">Complexity</label>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-950 p-3 text-sm text-stone-100 focus:border-orange-600 focus:outline-none"
            >
              <option>Simple MVP</option>
              <option>Standard App</option>
              <option>Advanced Platform</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-orange-700 hover:bg-orange-600 px-5 py-4 text-sm font-black text-white transition disabled:opacity-50"
          >
            {loading ? "Generating your app plan..." : "Generate App Plan →"}
          </button>
        </div>
      </div>
    </main>
  );
}