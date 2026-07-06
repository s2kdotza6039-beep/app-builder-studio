import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold">Page not found</h1>

        <p className="mt-4 text-slate-300">
          The page you are looking for does not exist.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}