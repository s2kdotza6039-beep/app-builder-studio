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
  IDEA: "bg-stone-700 text-stone-300",
  PLANNING: "bg-blue-950/60 border border-blue-800/50 text-blue-300",
  READY_TO_BUILD: "bg-yellow-950/60 border border-yellow-800/50 text-yellow-300",
  BUILDING: "bg-orange-950/60 border border-orange-800/50 text-orange-300",
  TESTING: "bg-purple-950/60 border border-purple-800/50 text-purple-300",
  LAUNCHED: "bg-emerald-950/60 border border-emerald-800/50 text-emerald-300",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      projects: {
        orderBy: { updated_at: "desc" },
        include: {
          _count: { select: { routes: true, features: true, files: true } },
        },
      },
    },
  });

  if (!user) redirect("/auth");

  const isAdmin = user.role === "ADMIN";
  const limit = isAdmin ? Infinity : PROJECT_LIMITS[user.subscription_plan || "FREE"] || 3;
  const projectCount = user.projects.length;
  const canCreate = isAdmin || projectCount < limit;
  const mostRecentProject = user.projects[0] || null;
  const otherProjects = user.projects.slice(1);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "Founder";

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      <header className="border-b border-stone-800 bg-stone-900 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div>
              <p className="font-bold text-stone-100 leading-none text-sm">App Builder Studio</p>
              <p className="text-xs text-stone-500 leading-none mt-0.5">by S2KDOTZA Entertainment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/brain-dump" className="rounded-xl border border-orange-800/50 bg-orange-900/20 hover:bg-orange-900/30 px-4 py-2 text-sm font-bold text-orange-400 transition">
              🧠 Brain Dump
            </Link>
            {canCreate ? (
              <Link href="/builder/new" className="rounded-xl bg-orange-700 hover:bg-orange-600 px-4 py-2 text-sm font-bold text-white transition">
                + New Project
              </Link>
            ) : (
              <span className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-500">Limit Reached</span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm text-stone-500 mb-1">{greeting},</p>
          <h1 className="text-4xl font-black text-stone-100">{firstName}.</h1>
          <p className="text-stone-500 mt-2 text-sm">
            {isAdmin ? "Admin Access — Unlimited Projects" : `${projectCount} of ${limit} projects · ${user.subscription_plan} plan`}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            {user.projects.length === 0 && (
              <div className="rounded-2xl border border-stone-700 bg-stone-900 p-12 text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-2xl font-black text-stone-100 mb-2">No projects yet</h3>
                <p className="text-stone-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  Start by dropping your first idea into Brain Dump. Shang Tsung structures it in seconds.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/brain-dump" className="rounded-xl border border-orange-800/50 bg-orange-900/20 hover:bg-orange-900/30 px-6 py-3 text-sm font-bold text-orange-400 transition">🧠 Brain Dump</Link>
                  <Link href="/builder/new" className="rounded-xl bg-orange-700 hover:bg-orange-600 px-6 py-3 text-sm font-bold text-white transition">+ New Project</Link>
                </div>
              </div>
            )}

            {mostRecentProject && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Continue where you left off</p>
                <div className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${STATUS_COLORS[mostRecentProject.status] || "bg-stone-700 text-stone-300"}`}>
                        {mostRecentProject.status}
                      </span>
                      <span className="text-xs text-stone-500">{mostRecentProject.app_type}</span>
                    </div>
                    <h2 className="text-2xl font-black text-stone-100 truncate">{mostRecentProject.app_name || "Untitled Project"}</h2>
                    <p className="text-stone-400 text-sm mt-2 line-clamp-2">{mostRecentProject.app_description || "No description yet."}</p>
                    <div className="flex gap-4 mt-4 text-xs text-stone-500">
                      <span>📄 {mostRecentProject._count.routes} pages</span>
                      <span>⚡ {mostRecentProject._count.features} features</span>
                      <span>📦 {mostRecentProject._count.files} files</span>
                    </div>
                  </div>
                  <div className="border-t border-stone-800 bg-stone-800/50 px-6 py-4 flex gap-3">
                    <Link href={`/builder/${mostRecentProject.id}/overview`} className="flex-1 rounded-xl border border-stone-600 hover:bg-stone-700 px-4 py-3 text-sm font-bold text-stone-100 text-center transition">
                      ← Continue Planning
                    </Link>
                    <Link href={`/builder/${mostRecentProject.id}/forge`} className="flex-1 rounded-xl bg-orange-700 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white text-center transition">
                      🔨 Enter The Forge
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {otherProjects.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">All projects</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {otherProjects.map((project) => (
                    <Link key={project.id} href={`/builder/${project.id}/overview`}
                      className="block rounded-2xl border border-stone-700 bg-stone-900 p-5 transition hover:border-orange-800/50 hover:bg-stone-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[project.status] || "bg-stone-700 text-stone-300"}`}>
                          {project.status}
                        </span>
                      </div>
                      <h3 className="font-black text-stone-100 truncate">{project.app_name || "Untitled Project"}</h3>
                      <p className="text-stone-400 text-xs mt-1 line-clamp-2">{project.app_description || "No description yet."}</p>
                      <div className="flex gap-3 mt-3 text-xs text-stone-600">
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

          <div className="space-y-5">
            <div className="rounded-2xl border border-stone-700 bg-stone-900 overflow-hidden">
              <div className="border-b border-stone-800 bg-stone-800/50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-400">🥋 Shang Tsung</p>
                <h3 className="font-black text-stone-100 mt-1 text-sm">What would you like to do?</h3>
              </div>
              <div className="p-4 space-y-2">
                <Link href="/brain-dump" className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-800 hover:border-orange-800/50 hover:bg-stone-700 p-3.5 transition group">
                  <span className="text-xl">🧠</span>
                  <div>
                    <p className="text-sm font-bold text-stone-100 group-hover:text-orange-400 transition">Brain Dump</p>
                    <p className="text-xs text-stone-500">Capture a new idea instantly</p>
                  </div>
                </Link>
                {mostRecentProject && (
                  <Link href={`/builder/${mostRecentProject.id}/overview`} className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-800 hover:border-orange-800/50 hover:bg-stone-700 p-3.5 transition group">
                    <span className="text-xl">📋</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-100 group-hover:text-orange-400 transition">Continue Planning</p>
                      <p className="text-xs text-stone-500 truncate">{mostRecentProject.app_name || "Last project"}</p>
                    </div>
                  </Link>
                )}
                {mostRecentProject && (
                  <Link href={`/builder/${mostRecentProject.id}/forge`} className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-800 hover:border-orange-800/50 hover:bg-stone-700 p-3.5 transition group">
                    <span className="text-xl">🔨</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-100 group-hover:text-orange-400 transition">Enter The Forge</p>
                      <p className="text-xs text-stone-500 truncate">{mostRecentProject.app_name || "Last project"}</p>
                    </div>
                  </Link>
                )}
                {canCreate && (
                  <Link href="/builder/new" className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-800 hover:border-orange-800/50 hover:bg-stone-700 p-3.5 transition group">
                    <span className="text-xl">✨</span>
                    <div>
                      <p className="text-sm font-bold text-stone-100 group-hover:text-orange-400 transition">New Project</p>
                      <p className="text-xs text-stone-500">Start from a structured form</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-900 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">Your Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-400">Total Projects</span>
                  <span className="text-sm font-black text-stone-100">{projectCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-400">Limit</span>
                  <span className="text-sm font-black text-stone-100">{isAdmin ? "Unlimited" : limit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-400">Plan</span>
                  <span className="text-sm font-black text-orange-400">{isAdmin ? "Admin" : user.subscription_plan}</span>
                </div>
                {!isAdmin && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-stone-600 mb-1.5">
                      <span>Usage</span>
                      <span>{projectCount}/{limit}</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-1.5">
                      <div className="bg-orange-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((projectCount / (limit as number)) * 100, 100)}%` }} />
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