"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id?: string;
  role: "user" | "assistant";
  message: string;
}

const welcomeMessage: Message = {
  role: "assistant",
  message:
    `I am Shang Tsung — your Game Plan Architect.\n\n` +
    `Tell me what you want to build.\n\n` +
    `Examples:\n` +
    `• Add a payment feature\n` +
    `• Create a profile page\n` +
    `• Add an orders table\n` +
    `• Give me a project summary\n` +
    `• Suggest improvements`,
};

const quickCommands = [
  "Give me a summary",
  "Suggest improvements",
  "Add a profile page",
  "Add a payment feature",
];

export default function ShangTsung({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/chat`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const rawText = await response.text();

        let data: {
          messages?: Array<{
            id?: string;
            role?: string;
            message?: string;
          }>;
          error?: string;
        } = {};

        if (rawText) {
          data = JSON.parse(rawText);
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to load chat history.");
        }

        const savedMessages: Message[] = (data.messages || [])
          .filter((item) => item?.message)
          .map((item) => ({
            id: item.id,
            role: item.role === "user" ? "user" : "assistant",
            message: item.message || "",
          }));

        if (active) {
          setMessages(
            savedMessages.length > 0
              ? savedMessages
              : [welcomeMessage]
          );
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Could not load chat history.";

        if (active) {
          setMessages([welcomeMessage]);
          setError(message);
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(command?: string) {
    const userMessage = (command || input).trim();

    if (!userMessage || loading) {
      return;
    }

    setInput("");
    setError("");
    setLoading(true);

    setMessages((current) => [
      ...current,
      {
        role: "user",
        message: userMessage,
      },
    ]);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
          }),
        }
      );

      const rawText = await response.text();

      let data: {
        reply?: string;
        action?: unknown;
        error?: string;
      } = {};

      if (rawText) {
        data = JSON.parse(rawText);
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Shang Tsung could not complete the request."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          message:
            data.reply ||
            "The request was completed, but no written response was returned.",
        },
      ]);

      if (data.action) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            message:
              "✅ The project has been updated. The Architecture Preview is refreshing.",
          },
        ]);

        window.setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Something went wrong.";

      setError(message);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          message: `I could not complete that request: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      {/* Quick commands */}
      <div className="border-b border-slate-800 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quick commands
        </p>

        <div className="flex flex-wrap gap-2">
          {quickCommands.map((command) => (
            <button
              key={command}
              type="button"
              onClick={() => sendMessage(command)}
              disabled={loading}
              className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition hover:border-orange-500 hover:text-orange-300 disabled:opacity-50"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loadingHistory && (
          <div className="text-sm text-slate-500">
            Loading conversation...
          </div>
        )}

        {!loadingHistory &&
          messages.map((item, index) => (
            <div
              key={item.id || `${item.role}-${index}`}
              className={
                item.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={[
                  "max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
                  item.role === "user"
                    ? "rounded-br-none bg-orange-600 text-white"
                    : "rounded-bl-none border border-slate-700 bg-slate-800 text-slate-200",
                ].join(" ")}
              >
                {item.message}
              </div>
            </div>
          ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-none border border-orange-900 bg-orange-950/50 px-4 py-3 text-sm text-orange-300">
              Shang Tsung is planning...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-red-900 bg-red-950/40 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want Shang Tsung to build..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Enter to send · Shift+Enter for a new line
          </p>

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Building..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}