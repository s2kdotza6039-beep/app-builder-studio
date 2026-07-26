import { z } from "zod";

/**
 * Strict shape we require from Shang Tsung's AI output.
 * Keeping this in one place means the parser, the retry loop,
 * and the UI all agree on the contract.
 */

export const fileChangeSchema = z.object({
  file_path: z.string(),
  content: z.string(),
  // "create" | "update" | "delete" — defaults to "update" if missing.
  action: z.enum(["create", "update", "delete"]).default("update"),
});

export const forgeChatResponseSchema = z.object({
  reply: z.string(),
  // The AI may name this "files", "updatedFiles", "createdFiles" or "modifiedFiles".
  // We normalise that in codeEditor.ts, so here we just accept "files".
  files: z.array(fileChangeSchema).optional().default([]),
  summary: z.string().optional(),
});

export type FileChange = z.infer<typeof fileChangeSchema>;
export type ForgeChatResponse = z.infer<typeof forgeChatResponseSchema>;
