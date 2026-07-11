import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DatabaseEditor from "./DatabaseEditor";
import ExportModal from "./ExportModal";
import FeaturesEditor from "./FeaturesEditor";
import RoutesEditor from "./RoutesEditor";
import ShangTsungDrawer from "./ShangTsungDrawer";

export default async function ProjectOverviewPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth");
  }

  const { projectId } = await props.params;

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/auth");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      user_id: user.id,
    },
    include: {
      routes: {
        orderBy: {
          sort_order: "asc",
        },
      },
      features: true,
      databaseTables: true,
    },
  });

  if (!project) {
    notFound();
  }

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
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            &larr; Dashboard
          </Link>

          <div className="h-5 w-px bg-slate-700" />

          <div>
            <h1 className="font-bold text-white">
              {project.app_name || "Untitled Project"}
            </h1>

            <p className="text-xs text-slate-500">
              Stage 1: Planning
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportModal gamePlan={gamePlan} />

          <Link
            href={`/builder/${projectId}/forge`}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            🔨 Enter The Forge &rarr;
          </Link>
        </div>
      </header>

      {/* Planning workspace */}
      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Sliding Shang Tsung Drawer (Client Component) */}
        <ShangTsungDrawer projectId={projectId} />

        {/* Right side: project architecture (padded left so drawer doesn't cover text when open) */}
        <section className="min-w-0 flex-1 overflow-y-auto p-6 md:pl-[400px]">
          <div className="mx-auto max-w-6xl">
            {/* Project summary */}
            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Planning Stage
                  </p>

                  <h2 className="mt-2 text-3xl font-bold">
                    {project.app_name || "Untitled Project"}
                  </h2>

                  <p className="mt-3 max-w-3xl text-slate-400">
                    {project.app_description ||
                      "No project description has been added yet."}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-right">
                  <p className="text-sm font-bold text-emerald-400">
                    Ready for Stage 2
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Enter The Forge to generate code.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1 text-blue-300">
                  {project.routes.length} Pages
                </span>

                <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1 text-purple-300">
                  {project.features.length} Features
                </span>

                <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                  {project.databaseTables.length} Tables
                </span>
              </div>
            </div>

            {/* Editable architecture sections */}
            <div className="grid gap-6">
              <RoutesEditor
                projectId={projectId}
                initialRoutes={routesForEditor}
              />

              <FeaturesEditor
                projectId={projectId}
                initialFeatures={featuresForEditor}
              />

              <DatabaseEditor
                projectId={projectId}
                initialTables={tablesForEditor}
              />
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
  routes: Array<{
    page_name: string;
    route_path: string;
    purpose: string | null;
  }>;
  features: Array<{
    feature_name: string;
    priority: string | null;
  }>;
  databaseTables: Array<{
    table_name: string;
    purpose: string | null;
  }>;
}) {
  const routesText =
    project.routes.length > 0
      ? project.routes
          .map(
            (route) =>
              `- ${route.page_name} (${route.route_path}) — ${
                route.purpose || "General application page"
              }`
          )
          .join("\n")
      : "- No routes have been defined.";

  const featuresText =
    project.features.length > 0
      ? project.features
          .map(
            (feature) =>
              `- ${feature.feature_name} [${
                feature.priority || "Should Have"
              }]`
          )
          .join("\n")
      : "- No features have been defined.";

  const databaseText =
    project.databaseTables.length > 0
      ? project.databaseTables
          .map(
            (table) =>
              `- ${table.table_name}: ${
                table.purpose || "Stores application data"
              }`
          )
          .join("\n")
      : "- No database tables have been defined.";

  return `
APP NAME:
${project.app_name || "Untitled App"}

APP PURPOSE:
${project.app_description || "Not specified"}

TARGET USERS:
${project.target_users || "Not specified"}

STAGE 1 — PLANNING

ROUTES:
${routesText}

FEATURES:
${featuresText}

DATABASE:
${databaseText}

STAGE 2 — BUILDING

The approved planning architecture must now be transformed into application files, working pages, reusable components, and a live preview inside The Forge.

Generated by App Builder Studio.
`.trim();
}