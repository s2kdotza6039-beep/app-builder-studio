"use client";

import { signIn } from "next-auth/react";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-700 mb-4">
            <span className="text-white font-black text-xl">S</span>
          </div>
          <h1 className="text-3xl font-black text-stone-100">App Builder Studio</h1>
          <p className="text-stone-400 text-sm mt-2">by S2KDOTZA Entertainment</p>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900 p-8">
          <h2 className="text-xl font-black text-stone-100 mb-2">Welcome back, Founder.</h2>
          <p className="text-stone-400 text-sm mb-8">Sign in to access your command center.</p>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-600 bg-stone-800 hover:bg-stone-700 px-5 py-3.5 text-sm font-bold text-stone-100 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
              <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
              <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
              <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-stone-500">
            By signing in you agree to use App Builder Studio responsibly.
          </p>
        </div>

        <p className="text-center text-xs text-stone-600 mt-6">
          © {new Date().getFullYear()} S2KDOTZA Entertainment
        </p>
      </div>
    </main>
  );
}