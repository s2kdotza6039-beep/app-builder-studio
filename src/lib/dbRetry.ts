/**
 * dbRetry.ts — Neon wake-up handler for App Builder Studio
 *
 * WHY THIS EXISTS
 * ---------------
 * Neon's free plan suspends the database compute after 5 minutes of inactivity.
 * That is not a bug and it cannot be turned off on the free plan.
 *
 * When your app touches a sleeping database, Neon starts waking it up immediately.
 * The wake-up takes roughly 150-500ms. The problem was never the sleep - it was that
 * our code made ONE attempt, got refused, and gave up before the wake-up finished.
 *
 * withRetry() simply waits and tries again. By attempt 2 or 3 the database is awake.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It only retries CONNECTION failures. A genuine bug - bad query, missing table,
 * unique-constraint violation - is thrown immediately on the first attempt, exactly
 * as before. We never retry something that will obviously fail again.
 */

/** Prisma error codes that mean "the server isn't reachable / not ready yet". */
const RETRYABLE_PRISMA_CODES = new Set([
  "P1000", // authentication failed (can appear transiently while compute boots)
  "P1001", // can't reach database server  <-- the main one you saw
  "P1002", // server reached but timed out
  "P1008", // operation timed out
  "P1017", // server has closed the connection
  "P2024", // timed out fetching a connection from the pool
]);

/** Text fragments that signal a transport-level failure. */
const RETRYABLE_TEXT = [
  "can't reach database server",
  "cannot reach database server",
  // Neon pooler drops idle sockets. Prisma surfaces this as:
  //   "Error in PostgreSQL connection: Error { kind: Closed, cause: None }"
  // It is always transient - the next connection succeeds.
  "kind: closed",
  "error in postgresql connection",
  "connection refused",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "socket hang up",
  "connection closed",
  "server has closed the connection",
  "terminating connection",
  "the database system is starting up",
  "timed out fetching a new connection",
];

/**
 * Decide whether an error is worth retrying.
 * Exported so routes can branch on it (e.g. show "waking up" vs "real error").
 */
export function isConnectionError(error: unknown): boolean {
  if (!error) return false;

  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string") {
    if (RETRYABLE_PRISMA_CODES.has(code)) return true;
    // Node-level socket errors surface as ECONNREFUSED, ETIMEDOUT, etc.
    if (RETRYABLE_TEXT.includes(code.toLowerCase())) return true;
  }

  const message =
    typeof (error as { message?: unknown })?.message === "string"
      ? ((error as { message: string }).message)
      : String(error);

  const haystack = message.toLowerCase();
  return RETRYABLE_TEXT.some((needle) => haystack.includes(needle));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RetryOptions = {
  /** How many total attempts. Default 4. */
  attempts?: number;
  /** Delay before the 2nd attempt, in ms. Doubles each time. Default 400. */
  baseDelayMs?: number;
  /** Label used in server logs so you can see which call is waking the DB. */
  label?: string;
};

/**
 * Run a database operation, retrying only if the database was asleep/unreachable.
 *
 * Usage:
 *   const rows = await withRetry(() => prisma.projectFile.findMany({ where: { project_id: id } }));
 *
 * Timing with defaults (4 attempts, 400ms base):
 *   attempt 1 -> fails instantly (compute asleep)
 *   wait 400ms   -> attempt 2   (Neon usually awake by here)
 *   wait 800ms   -> attempt 3
 *   wait 1600ms  -> attempt 4
 *   total worst case ~2.8s, then it throws the real error.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const label = options.label ?? "db";

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await operation();

      if (attempt > 1) {
        console.log(`[dbRetry] ${label}: recovered on attempt ${attempt}/${attempts}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // A real bug (bad query, missing table, constraint violation).
      // Retrying would just fail again - fail fast so you see the true error.
      if (!isConnectionError(error)) {
        throw error;
      }

      // Out of attempts - give up and let the caller handle it.
      if (attempt === attempts) break;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[dbRetry] ${label}: database asleep or unreachable ` +
          `(attempt ${attempt}/${attempts}). Waking it up, retrying in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }

  console.error(
    `[dbRetry] ${label}: still unreachable after ${attempts} attempts. Giving up.`,
  );
  throw lastError;
}

/**
 * Same as withRetry, but returns a fallback value instead of throwing.
 * Use this for non-critical reads where a blank list is better than a crashed page.
 *
 *   const suggestions = await withRetrySafe(() => prisma.x.findMany(), [], { label: "suggestions" });
 */
export async function withRetrySafe<T>(
  operation: () => Promise<T>,
  fallback: T,
  options: RetryOptions = {},
): Promise<T> {
  try {
    return await withRetry(operation, options);
  } catch (error) {
    console.error(`[dbRetry] ${options.label ?? "db"}: returning fallback.`, error);
    return fallback;
  }
}

/**
 * Nudge the database awake without caring about the result.
 * Call this at the very start of a slow route so the compute is booting
 * while the rest of your code (auth checks, parsing) runs.
 */
export async function warmDatabase(
  client: { $queryRaw: (q: TemplateStringsArray) => Promise<unknown> },
): Promise<boolean> {
  try {
    await withRetry(() => client.$queryRaw`SELECT 1`, {
      attempts: 3,
      baseDelayMs: 300,
      label: "warmup",
    });
    return true;
  } catch {
    return false;
  }
}
