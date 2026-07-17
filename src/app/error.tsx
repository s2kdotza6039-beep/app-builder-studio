"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100">
      <div className="mx-auto max-w-3xl text-center pt-20">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
        <p className="text-stone-400 mb-8">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="rounded-xl bg-orange-700 hover:bg-orange-600 px-6 py-3 text-sm font-black text-white transition"
        >
          Try again
        </button>
      </div>
    </main>
  );
}