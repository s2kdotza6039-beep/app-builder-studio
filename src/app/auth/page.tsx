"use client";

import { signIn } from "next-auth/react";

export default function AuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            App Builder Studio
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Sign in to continue
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Build powerful apps from simple ideas. Sign in to save your projects,
            generate app plans, and export your final build brief.
          </p>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          By signing in, you agree to use App Builder Studio responsibly and
          protect your account access.
        </p>
      </div>
    </main>
  );
}