"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface HistoryMessage {
  id: string;
  role: string;
  message: string;
  created_at: string;
  pinned?: boolean;
}

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

export default function HistoryPage() {
  const params = useParams();
  const id = String(params.id);

  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [filter, setFilter] = useState<"all" | "user" | "assistant">("all");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyMsg = async (mid: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(mid);
      setTimeout(() => setCopiedId((c) => (c === mid ? null : c)), 1500);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${id}/messages`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : data.messages ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const togglePin = async (mid: string, pinned: boolean) => {
    await fetch(`/api/projects/${id}/messages/${mid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    load();
  };

  const del = async (mid: string) => {
    await fetch(`/api/projects/${id}/messages/${mid}`, { method: "DELETE" });
    setMessages((m) => m.filter((x) => x.id !== mid));
  };

  const filtered = messages.filter((m) =>
    filter === "all" ? true : m.role === filter
  );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filterCls = (f: string) =>
    `rounded-md px-3 py-1 text-xs font-semibold ${
      filter === f ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/projects/${id}/forge`}
            className="text-sm text-violet-300 hover:text-violet-200"
          >
            ← Back to Forge
          </Link>
          <h1 className="text-lg font-semibold">Shang Tsung Chat History</h1>
          <div className="w-24" />
        </div>

        {/* filters */}
        <div className="mb-4 flex gap-2">
          <button className={filterCls("all")} onClick={() => setFilter("all")}>
            All
          </button>
          <button className={filterCls("user")} onClick={() => setFilter("user")}>
            You
          </button>
          <button
            className={filterCls("assistant")}
            onClick={() => setFilter("assistant")}
          >
            Shang Tsung
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No messages.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {isUser ? "You" : "Shang Tsung"}
                    </span>
                    <span className="text-[10px] text-slate-600">{fmt(m.created_at)}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-200">
                    {m.message}
                  </div>
                  {/* hover actions */}
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => copyMsg(m.id, m.message)}
                      title="Copy message"
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      {copiedId === m.id ? "Copied!" : "⧉"}
                    </button>
                    <button
                      onClick={() => togglePin(m.id, !!m.pinned)}
                      title={m.pinned ? "Unpin" : "Pin to memory"}
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-amber-300 hover:bg-slate-800"
                    >
                      {m.pinned ? "⭐ Pinned" : "☆ Pin"}
                    </button>
                    <button
                      onClick={() => del(m.id)}
                      title="Delete message"
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-red-300 hover:bg-slate-800"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
