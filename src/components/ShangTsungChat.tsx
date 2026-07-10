"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id?: string;
  role: string;
  message: string;
}

export default function ShangTsungChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetch(`/api/projects/${projectId}/chat`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([{ role: "assistant", message: "I am Shang Tsung. What is your vision for this app?" }]);
          }
        });
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", message: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", message: data.text }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", message: "Connection lost. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 shadow-2xl hover:bg-orange-500 transition-transform hover:scale-105"
        title="Consult Shang Tsung"
      >
        <span className="text-2xl">🐉</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 p-4 border-b border-slate-800">
            <h3 className="font-bold text-orange-400 flex items-center gap-2">
              <span>🐉</span> Shang Tsung
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === "user" ? "bg-slate-700 text-white rounded-br-none" : "bg-orange-900/30 border border-orange-800/50 text-orange-100 rounded-bl-none"}`}>
                  {msg.message}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-orange-900/30 border border-orange-800/50 text-orange-400 rounded-xl rounded-bl-none p-3 text-xs animate-pulse">
                  Contemplating...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="bg-slate-950 p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask for advice..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-orange-600 p-2 rounded-lg text-white hover:bg-orange-500 disabled:opacity-50"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}