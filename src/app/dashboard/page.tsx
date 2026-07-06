import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          App Builder Studio
        </p>

        <h1 className="text-4xl font-bold">
          Welcome to your dashboard
        </h1>

        <p className="mt-4 text-slate-300">
          You are signed in successfully. This is where your app projects will
          appear.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Signed-in user
          </h2>

          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>
              <strong>Name:</strong> {session.user?.name || "No name provided"}
            </p>

            <p>
              <strong>Email:</strong> {session.user?.email || "No email provided"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}