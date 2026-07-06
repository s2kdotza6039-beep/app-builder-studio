import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          App Builder Studio
        </p>

        <h1 className="text-4xl font-bold">
          App Builder Studio is running
        </h1>

        <p className="mt-4 text-slate-300">
          The application is loaded successfully. Continue to authentication.
        </p>

        <Link
          href="/auth"
          className="mt-8 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
        >
          Go to Sign In
        </Link>
      </div>
    </main>
  );
}