"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  message: string;
}

export default function ShangTsung({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: `I am Shang Tsung — your Game Plan Architect.\n\nTell me what you want to build and I will make it happen.\n\nTry:\n• "Add a payment feature"\n• "Add a profile page"\n• "Add an orders table"\n• "Give me a summary"\n• "What should I improve?"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", message: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", message: data.reply }]);

        // If Shang Tsung added something, notify the user to refresh
        if (data.action) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              message: "✅ Done. Scroll up to see the update, or refresh the page to see the full changes.",
            },
          ]);
        }
      }
    } catch (err) {
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
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 font-semibold text-white shadow-2xl hover:bg-orange-500 transition"
      >
        {isOpen ? "✕ Close" : "🥋 Shang Tsung"}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col w-96 h-[560px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 bg-slate-800 px-5 py-4 border-b border-slate-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-lg">
              🥋
            </div>
            <div>
              <p className="font-bold text-white">Shang Tsung</p>
              <p className="text-xs text-slate-400">Game Plan Architect</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-orange-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 text-sm">
                  Shang Tsung is thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Shang Tsung anything..."
                rows={2}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 disabled:opacity-40 transition"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}