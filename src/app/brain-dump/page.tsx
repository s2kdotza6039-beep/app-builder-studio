"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "choose" | "fast" | "conversation" | "done";
interface ConversationMessage { role: "shang" | "user"; text: string; }
interface ProjectPreview {
  app_name: string; app_type: string; app_description: string;
  target_users: string; business_model: string;
  routes: Array<{ page_name: string; route_path: string; purpose: string }>;
  features: Array<{ feature_name: string; priority: string }>;
  database_tables: Array<{ table_name: string; purpose: string }>;
}

export default function BrainDumpPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [fastInput, setFastInput] = useState("");
  const [fastProcessing, setFastProcessing] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: "shang", text: "I am Shang Tsung. Let us plan this properly.\n\nTell me — what is the idea? Describe it in your own words, no pressure." },
  ]);
  const [convInput, setConvInput] = useState("");
  const [convThinking, setConvThinking] = useState(false);
  const [convReady, setConvReady] = useState(false);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleFastDump() {
    if (fastInput.trim().length < 10) { setError("Give me a bit more to work with."); return; }
    setError(""); setFastProcessing(true);
    try {
      const res = await fetch("/api/brain-dump/structure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: fastInput, mode: "fast" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPreview(data.project); setMode("done");
    } catch (e: any) { setError(e.message); }
    finally { setFastProcessing(false); }
  }

  async function handleConvSend() {
    if (!convInput.trim()) return;
    const userText = convInput.trim(); setConvInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]); setConvThinking(true);
    try {
      const history = messages.map((m) => ({ role: m.role === "shang" ? "assistant" : "user", content: m.text }));
      const res = await fetch("/api/brain-dump/converse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history, userMessage: userText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessages((prev) => [...prev, { role: "shang", text: data.reply }]);
      if (data.ready) { setConvReady(true); setPreview(data.project); }
    } catch { setMessages((prev) => [...prev, { role: "shang", text: "Something went wrong. Try again." }]); }
    finally { setConvThinking(false); }
  }

  async function handleConvStructure() {
    setConvThinking(true);
    try {
      const history = messages.map((m) => ({ role: m.role === "shang" ? "assistant" : "user", content: m.text }));
      const res = await fetch("/api/brain-dump/structure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: history.map((h) => h.content).join("\n"), mode: "conversation" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPreview(data.project); setMode("done");
    } catch (e: any) { setError(e.message); }
    finally { setConvThinking(false); }
  }

  async function handleCreateProject() {
    if (!preview) return; setCreating(true);
    try {
      const res = await fetch("/api/brain-dump/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: preview }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push(`/builder/${data.projectId}/overview`);
    } catch (e: any) { setError(e.message); setCreating(false); }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="border-b border-stone-800 bg-stone-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-stone-400 hover:text-stone-100 transition">&larr; Dashboard</Link>
          <div className="h-5 w-px bg-stone-700" />
          <div>
            <h1 className="font-black text-stone-100">🧠 Brain Dump</h1>
            <p className="text-xs text-stone-500">Capture your idea. Shang Tsung structures it.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {mode === "choose" && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-4xl font-black mb-3 text-stone-100">What kind of session is this?</h2>
              <p className="text-stone-400">Choose how you want to work with Shang Tsung right now.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button onClick={() => setMode("fast")} className="group rounded-2xl border border-stone-700 bg-stone-900 p-8 text-left hover:border-orange-700/50 hover:bg-stone-800 transition-all">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-black mb-2 text-stone-100 group-hover:text-orange-400 transition">Fast Dump</h3>
                <p className="text-stone-400 text-sm leading-relaxed">Type it raw — messy, incomplete, however it comes. Shang Tsung structures it in seconds.</p>
                <div className="mt-4 text-xs text-stone-600">⏱ Under 60 seconds from idea to project</div>
              </button>
              <button onClick={() => setMode("conversation")} className="group rounded-2xl border border-stone-700 bg-stone-900 p-8 text-left hover:border-orange-700/50 hover:bg-stone-800 transition-all">
                <div className="text-4xl mb-4">🥋</div>
                <h3 className="text-xl font-black mb-2 text-stone-100 group-hover:text-orange-400 transition">Plan with Shang Tsung</h3>
                <p className="text-stone-400 text-sm leading-relaxed">Think out loud. Shang Tsung asks the right questions and builds the structure through conversation.</p>
                <div className="mt-4 text-xs text-stone-600">💬 Natural back-and-forth until ready</div>
              </button>
            </div>
          </div>
        )}

        {mode === "fast" && (
          <div className="w-full max-w-2xl">
            <div className="mb-6">
              <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-stone-400 hover:text-stone-100 transition">&larr; Back</button>
            </div>
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">⚡</div>
              <h2 className="text-3xl font-black mb-2 text-stone-100">Fast Dump</h2>
              <p className="text-stone-400 text-sm">Just talk. Write it like you are texting a friend. Messy is fine.</p>
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-900 p-6">
              <textarea
                value={fastInput}
                onChange={(e) => setFastInput(e.target.value)}
                placeholder={`e.g. "I want to build an app for musicians where they upload beats and people can buy licenses..."`}
                rows={8}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-4 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600 resize-none leading-relaxed"
                autoFocus
              />
              {error && <div className="mt-3 rounded-lg bg-red-950/40 border border-red-800 p-3 text-sm text-red-300">{error}</div>}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-stone-600">{fastInput.length} characters</p>
                <button onClick={handleFastDump} disabled={fastProcessing || fastInput.trim().length < 10}
                  className="rounded-xl bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-8 py-3 font-black text-white transition">
                  {fastProcessing ? "Shang Tsung is thinking..." : "🥋 Structure This →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "conversation" && (
          <div className="w-full max-w-2xl flex flex-col" style={{ height: "70vh" }}>
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => { setMode("choose"); setMessages([{ role: "shang", text: "I am Shang Tsung. Let us plan this properly.\n\nTell me — what is the idea?" }]); setConvReady(false); }}
                className="text-sm text-stone-400 hover:text-stone-100 transition">&larr; Back</button>
              {convReady && (
                <button onClick={handleConvStructure} disabled={convThinking}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-600 px-6 py-2 text-sm font-black transition disabled:opacity-50">
                  ✅ Create Project from This
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-stone-700 bg-stone-900 p-4 space-y-4 mb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-orange-700 text-white rounded-br-none font-medium" : "bg-stone-800 text-stone-200 rounded-bl-none"}`}>
                    {msg.role === "shang" && <p className="text-xs text-orange-400 font-black mb-1">🥋 Shang Tsung</p>}
                    {msg.text}
                  </div>
                </div>
              ))}
              {convThinking && (
                <div className="flex justify-start">
                  <div className="bg-stone-800 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-stone-400 italic">Shang Tsung is thinking...</div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-900 p-4">
              <textarea value={convInput} onChange={(e) => setConvInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConvSend(); } }}
                placeholder="Talk to Shang Tsung..." rows={3}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-600 resize-none" autoFocus />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-stone-600">Enter to send · Shift+Enter for new line</p>
                <button onClick={handleConvSend} disabled={convThinking || !convInput.trim()}
                  className="rounded-xl bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-6 py-2 text-sm font-black text-white transition">Send</button>
              </div>
            </div>
          </div>
        )}

        {mode === "done" && preview && (
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-3xl font-black mb-2 text-stone-100">Shang Tsung Has Structured Your Idea</h2>
              <p className="text-stone-400 text-sm">Review the plan below. If it looks right, create the project.</p>
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden mb-6">
              <div className="border-b border-stone-800 bg-stone-800 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-stone-100">{preview.app_name}</h3>
                    <p className="text-stone-400 text-sm mt-1">{preview.app_description}</p>
                  </div>
                  <span className="rounded-full border border-orange-700/40 bg-orange-900/20 text-orange-400 text-xs px-3 py-1 font-bold">{preview.app_type}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-stone-400">
                  <div><span className="text-stone-600">Target:</span> {preview.target_users}</div>
                  <div><span className="text-stone-600">Model:</span> {preview.business_model}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-0 divide-x divide-stone-800">
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">Pages ({preview.routes.length})</h4>
                  <ul className="space-y-2">
                    {preview.routes.map((r, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-stone-100 font-bold">{r.page_name}</span>
                        <span className="text-stone-600 font-mono text-xs ml-2">{r.route_path}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">Features ({preview.features.length})</h4>
                  <ul className="space-y-2">
                    {preview.features.map((f, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">✓</span>
                        <span className="text-stone-100">{f.feature_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5">
                  <h4 className="text-xs font-black uppercase text-stone-500 mb-3">Database ({preview.database_tables.length})</h4>
                  <ul className="space-y-2">
                    {preview.database_tables.map((t, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-orange-400 font-mono">{t.table_name}</span>
                        <p className="text-stone-600 text-xs">{t.purpose}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-950/40 border border-red-800 p-3 text-sm text-red-300">{error}</div>}
            <div className="flex gap-4">
              <button onClick={() => { setMode("choose"); setPreview(null); setFastInput(""); setError(""); }}
                className="flex-1 rounded-xl border border-stone-600 hover:bg-stone-800 py-4 font-bold transition text-stone-100">← Start Over</button>
              <button onClick={handleCreateProject} disabled={creating}
                className="flex-1 rounded-xl bg-orange-700 hover:bg-orange-600 disabled:opacity-50 px-10 py-4 font-black text-lg text-white transition">
                {creating ? "Creating Project..." : "🚀 Create Project →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}