"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-800 bg-red-950 p-8">
        <h1 className="text-3xl font-bold">Something went wrong</h1>

        <p className="mt-4 text-red-200">
          {error.message || "An unexpected error occurred."}
        </p>

        <button
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
        >
          Try again
        </button>
      </div>
    </main>
  );
}