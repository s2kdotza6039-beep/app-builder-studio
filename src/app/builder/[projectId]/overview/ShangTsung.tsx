"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  message: string;
}

interface SuggestionChip {
  label: string;
  message: string;
  icon: string;
}

const PLANNING_CHIPS: SuggestionChip[] = [
  { icon: "💡", label: "What is missing?", message: "What is missing from this app? What should I add?" },
  { icon: "🔐", label: "Add authentication", message: "Add a user authentication feature" },
  { icon: "📋", label: "Suggest improvements", message: "Suggest improvements for this app" },
  { icon: "💰", label: "Add payments", message: "Add a payment feature" },
  { icon: "📊", label: "Add analytics", message: "Add an analytics dashboard feature" },
  { icon: "🔔", label: "Add notifications", message: "Add a notifications system" },
  { icon: "📱", label: "Add mobile routes", message: "Add mobile-friendly routes" },
  { icon: "🗄️", label: "Review database", message: "Review the database structure and suggest improvements" },
];

export default function ShangTsung({
  projectId,
}: {
  projectId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: `I am Shang Tsung — your Planning Architect.\n\nTell me what to add, remove, or improve. Or tap a suggestion below.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const visibleChips = showAllChips ? PLANNING_CHIPS : PLANNING_CHIPS.slice(0, 4);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", message: textToSend }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", message: data.reply },
        ]);

        if (data.action) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              message: "✅ Done. Scroll up to see the update, or refresh the page to see the full changes.",
            },
          ]);
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-orange-600 text-white rounded-br-none"
                  : "bg-slate-800 text-slate-200 rounded-bl-none"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-xs text-orange-400 font-bold mb-1">
                  🥋 Shang Tsung
                </p>
              )}
              {msg.message}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-sm italic">
              Shang Tsung is thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Quick Commands
          </p>
          <button
            onClick={() => setShowAllChips(!showAllChips)}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            {showAllChips ? "Show less" : "Show more"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip.message)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:border-orange-600 hover:bg-slate-800 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-4 bg-slate-900">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Shang Tsung what to build..."
            rows={3}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 disabled:opacity-40 transition self-end"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}