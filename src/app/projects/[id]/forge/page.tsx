"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { CodeViewer, ViewerFile } from "@/components/forge/CodeViewer";

/* ----------------------------- types ----------------------------- */
interface Message {
  id: string;
  role: string;
  message: string;
  created_at: string;
  metadata?: any;
}
interface QuickCmd {
  label?: string;
  text?: string;
  command?: string;
}

/* --------------------------- helpers ----------------------------- */
function viewportStyle(mode: string): React.CSSProperties {
  if (mode === "tablet")
    return { width: 820, height: "100%", margin: "0 auto" };
  if (mode === "mobile")
    return { width: 390, height: "100%", margin: "0 auto" };
  return { width: "100%", height: "100%" }; // autofit + desktop
}

// Robust clipboard copy: uses the async Clipboard API when available,
// and falls back to a hidden textarea + execCommand for non-secure
// contexts (e.g. accessed over a LAN IP instead of localhost).
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy method */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Turn ANY suggestions response into clean { label, text } chips.
// Also splits one long "blob" of commands into individual chips.
function normQuick(qs: any): QuickCmd[] {
  let arr: any[] = [];
  if (Array.isArray(qs)) arr = qs;
  else if (Array.isArray(qs?.suggestions)) arr = qs.suggestions;
  else if (Array.isArray(qs?.commands)) arr = qs.commands;
  else if (Array.isArray(qs?.prompts)) arr = qs.prompts;
  else if (Array.isArray(qs?.quickCommands)) arr = qs.quickCommands;
  else if (Array.isArray(qs?.data)) arr = qs.data;

  const out: QuickCmd[] = [];
  for (const c of arr) {
    if (typeof c === "string") {
      // Split a blob like "Do A. Do B. Do C" into separate commands.
      const parts = c
        .split(/\.(?=\s*[A-Z(])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12);
      if (parts.length > 1) {
        for (const p of parts) {
          const clean = p.endsWith(".") ? p : p + ".";
          out.push({
            label: clean.length > 64 ? clean.slice(0, 61) + "…" : clean,
            text: clean,
          });
        }
      } else {
        out.push({
          label: c.length > 64 ? c.slice(0, 61) + "…" : c,
          text: c,
        });
      }
    } else {
      const label =
        c?.label ?? c?.text ?? c?.command ?? c?.prompt ?? c?.title ?? c?.name ?? "Command";
      const text = c?.text ?? c?.command ?? c?.prompt ?? c?.label ?? c?.title ?? "";
      out.push({ label, text });
    }
  }
  return out;
}

function MessageBubble({
  m,
  rating,
  onRate,
}: {
  m: Message;
  rating?: string;
  onRate: (r: "red" | "orange" | "green") => void;
}) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyToClipboard(m.message);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow ${
          isUser
            ? "bg-violet-600 text-white"
            : "border border-slate-700 bg-slate-800 text-slate-100"
        }`}
      >
        <button
          onClick={copy}
          title="Copy message"
          className="absolute right-2 top-2 cursor-pointer rounded-md border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] text-white/90 hover:bg-black/70"
        >
          {copied ? "Copied!" : "⧉ Copy"}
        </button>
        {rating && (
          <span
            title={`Rated: ${rating}`}
            className={`absolute left-2 bottom-2 h-2 w-2 rounded-full ${
              rating === "red" ? "bg-red-500" : rating === "orange" ? "bg-orange-500" : "bg-green-500"
            }`}
          />
        )}
        <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onRate("red"); }}
            title="Don't like (Red)"
            className={`h-3 w-3 rounded-full bg-red-500 ${rating === "red" ? "ring-2 ring-white" : ""}`}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onRate("orange"); }}
            title="Partial (Orange)"
            className={`h-3 w-3 rounded-full bg-orange-500 ${rating === "orange" ? "ring-2 ring-white" : ""}`}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onRate("green"); }}
            title="Love it (Green)"
            className={`h-3 w-3 rounded-full bg-green-500 ${rating === "green" ? "ring-2 ring-white" : ""}`}
          />
        </div>
        <div className="mb-1 pr-6 text-[10px] uppercase tracking-wider opacity-60">
          {isUser ? "You" : "Shang Tsung"}
        </div>
        <div className="whitespace-pre-wrap pr-6 pb-1">{m.message}</div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
        <span className="inline-flex gap-1">
          <span className="animate-bounce">●</span>
          <span className="animate-bounce [animation-delay:0.15s]">●</span>
          <span className="animate-bounce [animation-delay:0.3s]">●</span>
        </span>
        <span className="ml-2">Shang Tsung is working…</span>
      </div>
    </div>
  );
}

/* --------------------------- forge ------------------------------ */
function ForgeInner() {
  const params = useParams();
  const id = String(params.id);
  const { show } = useToast();

  const [projectName, setProjectName] = useState("Project");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [view, setView] = useState<"chat" | "code">("chat");
  const [files, setFiles] = useState<ViewerFile[]>([]);
  const [quick, setQuick] = useState<QuickCmd[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewport, setViewport] = useState<
    "autofit" | "desktop" | "tablet" | "mobile"
  >("autofit");
  const [previewWidth, setPreviewWidth] = useState(60); // percent
  const [dragging, setDragging] = useState(false);

  const chatEnd = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    try {
      const [p, m, f, q] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/messages`),
        fetch(`/api/projects/${id}/files`),
        fetch(`/api/projects/${id}/suggestions`),
      ]);
      const pj = await p.json();
      setProjectName(pj?.name ?? pj?.project?.name ?? "Project");
      const msgs = await m.json();
      setMessages(Array.isArray(msgs) ? msgs : msgs?.messages ?? []);
      const fls = await f.json();
      setFiles(Array.isArray(fls) ? fls : fls?.files ?? []);
      const qs = await q.json();
      setQuick(normQuick(qs));
    } catch (e) {
      console.error("loadAll error", e);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /* draggable splitter */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setPreviewWidth(Math.min(85, Math.max(30, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setThinking(true);
    setInput("");

    const uid = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempUser: Message = {
      id: uid + "-u",
      role: "user",
      message: t,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await fetch(`/api/projects/${id}/forge-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });
      const data = await res.json();
      if (data?.reply) {
        const ai: Message = {
          id: uid + "-a",
          role: "assistant",
          message: data.reply,
          created_at: new Date().toISOString(),
          metadata: data,
        };
        setMessages((prev) => [
          ...prev.filter((x) => x.id !== uid + "-u"),
          tempUser,
          ai,
        ]);
        if (data.filesChanged > 0) {
          show(
            `✅ Edited ${data.updated} · Created ${data.created} · Deleted ${data.deleted}`,
            "success"
          );
          setPreviewKey((k) => k + 1);
        } else {
          show("⚠️ No files changed — try rephrasing.", "info");
        }
        loadAll();
      } else {
        show("❌ Command failed — check the terminal.", "error");
      }
    } catch {
      show("❌ Network error — check the terminal.", "error");
    } finally {
      setThinking(false);
    }
  };

  const runAction = async (url: string, label: string) => {
    show(`${label} starting…`, "info");
    try {
      const r = await fetch(url, { method: "POST" });
      if (r.ok) show(`✅ ${label} done`, "success");
      else show(`❌ ${label} failed`, "error");
    } catch {
      show(`❌ ${label} error`, "error");
    }
  };

  const rateMessage = async (mid: string, rating: "red" | "orange" | "green") => {
    try {
      await fetch(`/api/projects/${id}/messages/${mid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      setMessages((prev) =>
        prev.map((x) =>
          x.id === mid ? { ...x, metadata: { ...(x.metadata || {}), rating } } : x
        )
      );
    } catch {
      /* ignore */
    }
  };

  const shuffle = () => setQuick((q) => [...q].sort(() => Math.random() - 0.5));
  const visible = messages.slice(-10);
  const previewSrc = `/api/projects/${id}/preview?path=%2F&k=${previewKey}`;

  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1 text-xs font-semibold ${
      active ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
    }`;
  const vpCls = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${
      active ? "bg-violet-600 text-white" : "text-slate-300 hover:bg-slate-800"
    }`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* ---------- HEADER ---------- */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-violet-400">◆</span> App Builder Studio
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">{projectName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runAction(`/api/projects/${id}/github/push`, "GitHub push")}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-violet-500 hover:text-violet-300"
          >
            GitHub
          </button>
          <button
            onClick={() => runAction(`/api/projects/${id}/vercel/deploy`, "Vercel deploy")}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-violet-500 hover:text-violet-300"
          >
            Vercel
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-violet-500 hover:text-violet-300"
          >
            ← Projects
          </Link>
        </div>
      </header>

      {/* ---------- BODY ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* PREVIEW (left) */}
        <div
          className="flex min-w-0 flex-col"
          style={{ width: `${previewWidth}%` }}
        >
          <div className="flex h-9 shrink-0 items-center gap-1 border-b border-slate-800 bg-slate-900 px-2">
            <button className={vpCls(viewport === "autofit")} onClick={() => setViewport("autofit")}>
              Auto Fit
            </button>
            <button className={vpCls(viewport === "desktop")} onClick={() => setViewport("desktop")}>
              🖥️
            </button>
            <button className={vpCls(viewport === "tablet")} onClick={() => setViewport("tablet")}>
              📱
            </button>
            <button className={vpCls(viewport === "mobile")} onClick={() => setViewport("mobile")}>
              📲
            </button>
            <div className="flex-1" />
            <button
              className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => setPreviewKey((k) => k + 1)}
              title="Reload preview"
            >
              ↻
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => window.open(previewSrc, "_blank")}
              title="Open in new tab"
            >
              ⧉
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-white">
            <iframe
              key={previewKey}
              src={previewSrc}
              title="preview"
              className="absolute inset-0 border-0"
              style={viewportStyle(viewport)}
            />
          </div>
        </div>

        {/* DIVIDER (drag to stretch preview) */}
        <div
          onMouseDown={() => setDragging(true)}
          className="w-1 shrink-0 cursor-col-resize bg-slate-800 hover:bg-violet-500"
          title="Drag to resize"
        />

        {/* CHAT (right) */}
        <div className="flex min-w-0 flex-1 flex-col border-l border-slate-800">
          {/* toolbar: Chat / Code switch + ZIP */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-3">
            <div className="flex gap-1">
              <button className={tabCls(view === "chat")} onClick={() => setView("chat")}>
                💬 Chat
              </button>
              <button className={tabCls(view === "code")} onClick={() => setView("code")}>
                ⟨⟩ Code
              </button>
            </div>
            <button
              onClick={() => (window.location.href = `/api/projects/${id}/export/zip`)}
              className="rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500"
            >
              ⬇ Download ZIP
            </button>
          </div>

          {view === "chat" ? (
            <>
              {/* QUICK COMMANDS (pinned, untouched logic) */}
              <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-3 py-2">
                <button
                  onClick={shuffle}
                  title="Shuffle quick commands"
                  className="shrink-0 rounded-md bg-violet-600/20 px-2 py-1 text-sm text-violet-200 hover:bg-violet-600/40"
                >
                  ✨
                </button>
                {quick.length === 0 && (
                  <span className="text-xs text-slate-500">No quick commands yet.</span>
                )}
                {quick.slice(0, 6).map((c, i) => {
                  const label = c.label || c.text || c.command || "Command";
                  const value = c.text || c.command || c.label || "";
                  return (
                    <button
                      key={i}
                      onClick={() => send(value)}
                      title={value}
                      className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-violet-500 hover:text-violet-200"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* MESSAGES (last 10 only) */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {visible.map((m) => (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    rating={m.metadata?.rating}
                    onRate={(r) => rateMessage(m.id, r)}
                  />
                ))}
                {thinking && <ThinkingBubble />}
                <div ref={chatEnd} />
              </div>

              {/* INPUT */}
              <div className="flex shrink-0 items-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Tell Shang Tsung what to build…"
                  className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={() => send(input)}
                  disabled={thinking}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  Send
                </button>
                <Link
                  href={`/projects/${id}/history`}
                  title="Chat history"
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-violet-500 hover:text-violet-200"
                >
                  🕘
                </Link>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1">
              <CodeViewer files={files} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgePage() {
  return (
    <ToastProvider>
      <ForgeInner />
    </ToastProvider>
  );
}
