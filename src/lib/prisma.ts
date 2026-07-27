import { PrismaClient } from "@prisma/client";
import { isConnectionError } from "./dbRetry";

// ---------------------------------------------------------------------------
// Singleton Prisma client — prevents too-many-connections in dev hot-reload.
//
// AUTOMATIC NEON WAKE-UP
// ----------------------
// Neon's free plan suspends the database after 5 minutes idle and it cannot be
// disabled. Waking it takes ~150-500ms.
//
// The $extends block below wraps EVERY query this client makes - including ones
// we never wrote ourselves, such as NextAuth's PrismaAdapter calling
// p.session.findUnique() during login. That is why auth was still failing even
// after we added withRetry() to our own routes: the adapter lives inside
// node_modules and never touched our code.
//
// It also handles "Error in PostgreSQL connection: Error { kind: Closed }",
// which is a stale pooled socket - very common right after Neon wakes up.
// ---------------------------------------------------------------------------

const RETRY_ATTEMPTS = 4;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: ["error", "warn"],
  });

  return base.$extends({
    name: "neon-auto-wake",
    query: {
      async $allOperations({ model, operation, args, query }) {
        let lastError: unknown;

        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            const result = await query(args);

            if (attempt > 1) {
              console.log(
                `[neon-wake] ${model ?? "raw"}.${operation}: recovered on attempt ${attempt}/${RETRY_ATTEMPTS}`,
              );
            }

            return result;
          } catch (error) {
            lastError = error;

            // Real bugs (bad query, unique constraint, missing table) must fail
            // immediately so you see the true error instead of a slow retry loop.
            if (!isConnectionError(error)) throw error;

            if (attempt === RETRY_ATTEMPTS) break;

            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(
              `[neon-wake] ${model ?? "raw"}.${operation}: database asleep ` +
                `(attempt ${attempt}/${RETRY_ATTEMPTS}). Waking it, retrying in ${delay}ms...`,
            );
            await sleep(delay);
          }
        }

        console.error(
          `[neon-wake] ${model ?? "raw"}.${operation}: unreachable after ${RETRY_ATTEMPTS} attempts.`,
        );
        throw lastError;
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export BOTH ways so every file's import style works:
export { prisma };
export default prisma;

// ---------------------------------------------------------------------------
// Manual retry helpers. Still available for non-Prisma work (e.g. wrapping an
// OpenAI call). Prisma queries no longer need them - the client retries itself.
// ---------------------------------------------------------------------------
export {
  withRetry,
  withRetrySafe,
  isConnectionError,
  warmDatabase,
} from "./dbRetry";
export type { RetryOptions } from "./dbRetry";
