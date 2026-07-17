import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DatabaseEditor from "./DatabaseEditor";
import ExportModal from "./ExportModal";
import FeaturesEditor from "./FeaturesEditor";
import RoutesEditor from "./RoutesEditor";
import ShangTsung from "./ShangTsung";

export default async function ProjectOverviewPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const { projectId } = await props.params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) redirect("/auth");

  const project = await prisma.project.findFirst({
    where: { id: projectId, user_id: user.id },
    include: {
      routes: { orderBy: { sort_order: "asc" } },
      features: true,
      databaseTables: true,
    },
  });

  if (!project) notFound();

  const gamePlan = generateGamePlan(project);

  const routesForEditor = project.routes.map((route) => ({
    ...route,
    purpose: route.purpose ?? "",
  }));

  const featuresForEditor = project.features.map((feature) => ({
    ...feature,
    priority: feature.priority ?? "Should Have",
    complexity: feature.complexity ?? "Medium",
  }));

  const tablesForEditor = project.databaseTables.map((table) => ({
    ...table,
    purpose: table.purpose ?? "",
  }));

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 bg-stone-900 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/dashboard" className="text-sm text-stone-400 transition hover:text-stone-100">
            &larr; Dashboard
          </Link>
          <div className="h-5 w-px bg-stone-700" />
          <div>
            <h1 className="font-black text-stone-100">
              {project.app_name || "Untitled Project"}
            </h1>
            <p className="text-xs text-stone-500">Stage 1: Planning</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportModal gamePlan={gamePlan} />
          <Link
            href={`/builder/${projectId}/forge`}
            className="rounded-xl bg-orange-700 hover:bg-orange-600 px-6 py-3 text-sm font-black text-white transition"
          >
            🔨 Enter The Forge &rarr;
          </Link>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex min-h-[calc(100vh-81px)]">
        {/* Left: Shang Tsung */}
        <aside className="w-[380px] flex-shrink-0 border-r border-stone-800 bg-stone-900">
          <div className="border-b border-stone-800 bg-stone-950 px-4 py-3">
            <h2 className="font-black text-orange-400">🥋 Shang Tsung</h2>
            <p className="mt-1 text-xs text-stone-500">Planning and architecture assistant</p>
          </div>
          <div className="h-[calc(100vh-145px)]">
            <ShangTsung projectId={projectId} />
          </div>
        </aside>

        {/* Right: Architecture */}
        <section className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">
            {/* Project Summary */}
            <div className="mb-6 rounded-2xl border border-stone-700 bg-stone-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-orange-500">
                    Planning Stage
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-stone-100">
                    {project.app_name || "Untitled Project"}
                  </h2>
                  <p className="mt-3 max-w-3xl text-stone-400">
                    {project.app_description || "No project description yet."}
                  </p>
                </div>
                <div className="rounded-xl border border-orange-800/40 bg-orange-900/20 px-4 py-3 text-right">
                  <p className="text-sm font-black text-orange-400">Ready for Stage 2</p>
                  <p className="mt-1 text-xs text-stone-500">Enter The Forge to generate code.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-blue-800/50 bg-blue-950/40 px-3 py-1 text-blue-300">
                  {project.routes.length} Pages
                </span>
                <span className="rounded-full border border-purple-800/50 bg-purple-950/40 px-3 py-1 text-purple-300">
                  {project.features.length} Features
                </span>
                <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                  {project.databaseTables.length} Tables
                </span>
              </div>
            </div>

            {/* Editors */}
            <div className="grid gap-6">
              <RoutesEditor projectId={projectId} initialRoutes={routesForEditor} />
              <FeaturesEditor projectId={projectId} initialFeatures={featuresForEditor} />
              <DatabaseEditor projectId={projectId} initialTables={tablesForEditor} />
            </div>

            <div className="h-20" />
          </div>
        </section>
      </div>
    </main>
  );
}

function generateGamePlan(project: {
  app_name: string | null;
  app_description: string | null;
  target_users: string | null;
  routes: Array<{ page_name: string; route_path: string; purpose: string | null }>;
  features: Array<{ feature_name: string; priority: string | null }>;
  databaseTables: Array<{ table_name: string; purpose: string | null }>;
}) {
  const routesText = project.routes.length > 0
    ? project.routes.map((r) => `- ${r.page_name} (${r.route_path}) — ${r.purpose || "General page"}`).join("\n")
    : "- No routes defined.";

  const featuresText = project.features.length > 0
    ? project.features.map((f) => `- ${f.feature_name} [${f.priority || "Should Have"}]`).join("\n")
    : "- No features defined.";

  const databaseText = project.databaseTables.length > 0
    ? project.databaseTables.map((t) => `- ${t.table_name}: ${t.purpose || "Stores data"}`).join("\n")
    : "- No tables defined.";

  return `
APP NAME: ${project.app_name || "Untitled App"}
APP PURPOSE: ${project.app_description || "Not specified"}
TARGET USERS: ${project.target_users || "Not specified"}

ROUTES:
${routesText}

FEATURES:
${featuresText}

DATABASE:
${databaseText}

Generated by App Builder Studio · S2KDOTZA Entertainment
`.trim();
}