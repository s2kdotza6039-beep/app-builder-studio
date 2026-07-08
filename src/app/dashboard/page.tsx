import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      projects: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              App Builder Studio
            </p>
            <h1 className="text-4xl font-bold">
              Welcome, {session.user?.name?.split(" ")[0] || "Founder"}
            </h1>
          </div>

          <Link
            href="/builder/new"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            + New Project
          </Link>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">Your projects</h2>

          {user?.projects.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-slate-400">
                You haven't created any projects yet. Start by describing your
                first app idea.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {user?.projects.map((project) => (
              <Link
                key={project.id}
                href={`/builder/${project.id}/overview`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
              >
                <h3 className="text-lg font-semibold text-white">
                  {project.app_name || "Untitled Project"}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {project.app_description || "No description yet."}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{project.app_type}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}