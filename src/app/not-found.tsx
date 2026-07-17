import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100">
      <div className="mx-auto max-w-3xl text-center pt-20">
        <div className="text-6xl mb-6">404</div>
        <h1 className="text-4xl font-black mb-4">Page not found</h1>
        <p className="mt-4 text-stone-400 mb-8">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-orange-700 hover:bg-orange-600 px-6 py-3 text-sm font-black text-white transition"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}