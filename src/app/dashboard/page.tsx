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

const STATUS_COLORS: Record<string, string> = {
  IDEA: "bg-slate-700 text-slate-300",
  PLANNING: "bg-blue-900/40 border border-blue-800 text-blue-300",
  READY_TO_BUILD: "bg-yellow-900/40 border border-yellow-800 text-yellow-300",
  BUILDING: "bg-orange-900/40 border border-orange-800 text-orange-300",
  TESTING: "bg-purple-900/40 border border-purple-800 text-purple-300",
  LAUNCHED: "bg-emerald-900/40 border border-emerald-800 text-emerald-300",
};

const SHANG_DASHBOARD_SUGGESTIONS = [
  { icon: "🧠", label: "Brain Dump a new idea", href: "/brain-dump" },
  { icon: "⚡", label: "Start a new project", href: "/builder/new" },
  { icon: "📋", label: "Review your latest project", href: null },
  { icon: "🔨", label: "Enter The Forge", href: null },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      projects: {
        orderBy: { updated_at: "desc" },
        include: {
          _count: {
            select: {
              routes: true,
              features: true,
              files: true,
            },
          },
        },
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

  const mostRecentProject = user.projects[0] || null;
  const otherProjects = user.projects.slice(1);

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "Founder";

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-bold text-white leading-none">
                App Builder Studio
              </p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">
                by S2KDOTZA Entertainment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/brain-dump"
              className="rounded-xl border border-orange-700 bg-orange-950/30 hover:bg-orange-900/40 px-4 py-2 text-sm font-semibold text-orange-400 transition"
            >
              🧠 Brain Dump
            </Link>

            {canCreate ? (
              <Link
                href="/builder/new"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                + New Project
              </Link>
            ) : (
              <span className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-500">
                Limit Reached
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Welcome Row */}
        <div className="mb-10">
          <p className="text-sm text-slate-500 mb-1">{greeting},</p>
          <h1 className="text-4xl font-black text-white">{firstName}.</h1>
          <p className="text-slate-400 mt-2 text-sm">
            {isAdmin
              ? "Admin Access — Unlimited Projects"
              : `${projectCount} of ${limit} projects used · ${user.subscription_plan} plan`}
          </p>
        </div>

        {/* Main Grid: Projects Left + Shang Tsung Right */}
        <div className="grid gap-8 lg:grid-cols-3">

          {/* LEFT: Projects (takes 2/3 of space) */}
          <div className="lg:col-span-2 space-y-6">

            {/* No projects state */}
            {user.projects.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-2xl font-bold mb-2">
                  No projects yet
                </h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  Start by dumping your first idea into Brain Dump —
                  Shang Tsung will structure it in seconds.
                  Or create a project manually.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link
                    href="/brain-dump"
                    className="rounded-xl border border-orange-700 bg-orange-950/30 hover:bg-orange-900/40 px-6 py-3 text-sm font-bold text-orange-400 transition"
                  >
                    🧠 Brain Dump
                  </Link>
                  <Link
                    href="/builder/new"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                  >
                    + New Project
                  </Link>
                </div>
              </div>
            )}

            {/* MOST RECENT PROJECT: Continue Card */}
            {mostRecentProject && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Continue where you left off
                </p>

                <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              STATUS_COLORS[mostRecentProject.status] ||
                              "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {mostRecentProject.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {mostRecentProject.app_type}
                          </span>
                        </div>

                        <h2 className="text-2xl font-black text-white truncate">
                          {mostRecentProject.app_name || "Untitled Project"}
                        </h2>

                        <p className="text-slate-400 text-sm mt-2 line-clamp-2 leading-relaxed">
                          {mostRecentProject.app_description ||
                            "No description yet."}
                        </p>

                        <div className="flex gap-4 mt-4 text-xs text-slate-500">
                          <span>
                            📄 {mostRecentProject._count.routes} pages
                          </span>
                          <span>
                            ⚡ {mostRecentProject._count.features} features
                          </span>
                          <span>
                            📦 {mostRecentProject._count.files} files generated
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="border-t border-slate-800 bg-slate-950 px-6 py-4 flex gap-3">
                    <Link
                      href={`/builder/${mostRecentProject.id}/overview`}
                      className="flex-1 rounded-xl bg-white hover:bg-slate-200 px-4 py-3 text-sm font-bold text-slate-900 text-center transition"
                    >
                      ← Continue Planning
                    </Link>
                    <Link
                      href={`/builder/${mostRecentProject.id}/forge`}
                      className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-3 text-sm font-bold text-white text-center transition"
                    >
                      🔨 Enter The Forge
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ALL OTHER PROJECTS */}
            {otherProjects.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  All projects
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {otherProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/builder/${project.id}/overview`}
                      className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            STATUS_COLORS[project.status] ||
                            "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-white truncate">
                        {project.app_name || "Untitled Project"}
                      </h3>

                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                        {project.app_description || "No description yet."}
                      </p>

                      <div className="flex gap-3 mt-3 text-xs text-slate-600">
                        <span>{project._count.routes} pages</span>
                        <span>{project._count.features} features</span>
                        <span>{project._count.files} files</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: Today's Panel (Shang Tsung Suggestions + Quick Actions) */}
          <div className="space-y-6">

            {/* Shang Tsung Today Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 bg-slate-950 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  🥋 Shang Tsung
                </p>
                <h3 className="font-bold text-white mt-1">
                  What would you like to do?
                </h3>
              </div>

              <div className="p-4 space-y-2">
                {/* Brain Dump */}
                <Link
                  href="/brain-dump"
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-orange-600 hover:bg-slate-800/60 p-4 transition group"
                >
                  <span className="text-2xl">🧠</span>
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                      Brain Dump
                    </p>
                    <p className="text-xs text-slate-500">
                      Capture a new idea instantly
                    </p>
                  </div>
                </Link>

                {/* Continue most recent */}
                {mostRecentProject && (
                  <Link
                    href={`/builder/${mostRecentProject.id}/overview`}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-blue-600 hover:bg-slate-800/60 p-4 transition group"
                  >
                    <span className="text-2xl">📋</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition truncate">
                        Continue Planning
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {mostRecentProject.app_name || "Last project"}
                      </p>
                    </div>
                  </Link>
                )}

                {/* Enter The Forge */}
                {mostRecentProject && (
                  <Link
                    href={`/builder/${mostRecentProject.id}/forge`}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-orange-600 hover:bg-slate-800/60 p-4 transition group"
                  >
                    <span className="text-2xl">🔨</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition">
                        Enter The Forge
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {mostRecentProject.app_name || "Last project"}
                      </p>
                    </div>
                  </Link>
                )}

                {/* New Project */}
                {canCreate && (
                  <Link
                    href="/builder/new"
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-emerald-600 hover:bg-slate-800/60 p-4 transition group"
                  >
                    <span className="text-2xl">✨</span>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                        New Project
                      </p>
                      <p className="text-xs text-slate-500">
                        Start from a structured form
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Your Stats
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Total Projects
                  </span>
                  <span className="text-sm font-bold text-white">
                    {projectCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Projects Limit
                  </span>
                  <span className="text-sm font-bold text-white">
                    {isAdmin ? "Unlimited" : limit}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Plan</span>
                  <span className="text-sm font-bold text-white">
                    {isAdmin ? "Admin" : user.subscription_plan}
                  </span>
                </div>

                {!isAdmin && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Usage</span>
                      <span>
                        {projectCount}/{limit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (projectCount / (limit as number)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}