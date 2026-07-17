import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROJECT_LIMITS: Record<string, number> = {
  FREE: 3,
  PRO: 20,
  BUSINESS: 100,
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      projects: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/auth");
  }

  const isAdmin = user.role === "ADMIN";
  const limit = isAdmin
    ? Infinity
    : PROJECT_LIMITS[user.subscription_plan || "FREE"] || 3;
  const projectCount = user.projects.length;
  const canCreate = isAdmin || projectCount < limit;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              App Builder Studio
            </p>
            <h1 className="text-4xl font-bold">
              Welcome, {session.user.name?.split(" ")[0] || "Founder"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isAdmin
                ? "Admin Access — Unlimited Projects"
                : `${projectCount} / ${limit} projects used (${user.subscription_plan} plan)`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Brain Dump Button */}
            <Link
              href="/brain-dump"
              className="rounded-xl border border-orange-700 bg-orange-950/30 hover:bg-orange-900/40 px-5 py-3 text-sm font-semibold text-orange-400 transition"
            >
              🧠 Brain Dump
            </Link>

            {/* New Project Button */}
            {canCreate ? (
              <Link
                href="/builder/new"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                + New Project
              </Link>
            ) : (
              <span className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-500">
                Limit Reached — Upgrade Plan
              </span>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold">Your projects</h2>

          {/* Empty State */}
          {user.projects.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Start by describing your first app idea using Brain Dump,
                or create a project manually.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/brain-dump"
                  className="rounded-xl border border-orange-700 bg-orange-950/30 hover:bg-orange-900/40 px-6 py-3 text-sm font-semibold text-orange-400 transition"
                >
                  🧠 Brain Dump
                </Link>
                <Link
                  href="/builder/new"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  + New Project
                </Link>
              </div>
            </div>
          )}

          {/* Project Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {user.projects.map((project) => (
              <Link
                key={project.id}
                href={`/builder/${project.id}/overview`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600 hover:bg-slate-800"
              >
                {/* Project Name */}
                <h3 className="text-lg font-semibold text-white">
                  {project.app_name || "Untitled Project"}
                </h3>

                {/* Project Description */}
                <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                  {project.app_description || "No description yet."}
                </p>

                {/* Project Meta */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{project.app_type || "App"}</span>
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