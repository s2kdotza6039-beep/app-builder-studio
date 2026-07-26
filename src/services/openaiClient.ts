/**
 * Defensive OpenAI client using the native fetch API.
 * NO extra npm package required — works on Node 18+/Next.js out of the box.
 *
 * If you later prefer the official SDK, swap callOpenAI's body for
 * `openai.chat.completions.create(...)` — the signature stays the same.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenAI(
  messages: ChatMessage[],
  opts?: { json?: boolean; model?: string; temperature?: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in .env.local");
  }

  const model = opts?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.2,
      // JSON mode keeps the AI's output parseable. Falls back gracefully
      // via extractJson() if the model ignores it.
      response_format: opts?.json ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI returned an unexpected response shape");
  }
  return content;
}
