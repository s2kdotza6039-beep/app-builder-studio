import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import ExportModal from "./ExportModal";
import RoutesEditor from "./RoutesEditor";
import FeaturesEditor from "./FeaturesEditor";
import DatabaseEditor from "./DatabaseEditor";
import WorkspaceShell from "./WorkspaceShell";

export default async function ProjectOverviewPage(props: {
  params: Promise<{
    projectId: string;
  }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth");
  }

  const { projectId } = await props.params;

  const currentUser = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!currentUser) {
    redirect("/auth");
  }

  const founderEmail =
    process.env.FOUNDER_EMAIL?.trim().toLowerCase() || "";

  const currentEmail =
    currentUser.email?.trim().toLowerCase() || "";

  const canAccessAnyProject =
    currentUser.role === "ADMIN" ||
    (founderEmail !== "" && currentEmail === founderEmail);

  const project = await prisma.project.findFirst({
    where: canAccessAnyProject
      ? {
          id: projectId,
        }
      : {
          id: projectId,
          user_id: currentUser.id,
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

  const routesKey =
    project.routes.map((item) => item.id).join("-") || "no-routes";

  const featuresKey =
    project.features.map((item) => item.id).join("-") || "no-features";

  const databaseKey =
    project.databaseTables.map((item) => item.id).join("-") ||
    "no-tables";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Main project toolbar */}
      <header className="flex h-[73px] items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 text-sm text-slate-400 transition hover:text-white"
          >
            &larr; Dashboard
          </Link>

          <div className="h-5 w-px bg-slate-700" />

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">
              {project.app_name || "Untitled Project"}
            </h1>

            <p className="truncate text-xs text-slate-500">
              {project.app_type || "Custom App"}
            </p>
          </div>

          <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 sm:inline-block">
            {project.status.replaceAll("_", " ")}
          </span>
        </div>

        <ExportModal gamePlan={gamePlan} />
      </header>

      <WorkspaceShell projectId={projectId}>
        <div className="mx-auto w-full max-w-7xl p-6">
          {/* Project summary */}
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  Project Architecture
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {project.app_name || "Untitled Project"}
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  {project.app_description ||
                    "No project description has been added yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-800 bg-blue-950/50 px-3 py-1.5 text-xs text-blue-300">
                  {project.routes.length} Pages
                </span>

                <span className="rounded-full border border-purple-800 bg-purple-950/50 px-3 py-1.5 text-xs text-purple-300">
                  {project.features.length} Features
                </span>

                <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1.5 text-xs text-emerald-300">
                  {project.databaseTables.length} Tables
                </span>
              </div>
            </div>
          </section>

          {/* Project editors */}
          <div className="grid gap-6">
            <RoutesEditor
              key={routesKey}
              projectId={projectId}
              initialRoutes={project.routes}
            />

            <FeaturesEditor
              key={featuresKey}
              projectId={projectId}
              initialFeatures={project.features}
            />

            <DatabaseEditor
              key={databaseKey}
              projectId={projectId}
              initialTables={project.databaseTables}
            />
          </div>

          <div className="h-16" />
        </div>
      </WorkspaceShell>
    </main>
  );
}

function generateGamePlan(project: {
  app_name: string | null;
  app_description: string | null;
  target_users: string | null;
  business_model: string | null;
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
}): string {
  const routesText =
    project.routes.length > 0
      ? project.routes
          .map(
            (item) =>
              `- ${item.page_name} (${item.route_path}) -> ${
                item.purpose || "General page"
              }`
          )
          .join("\n")
      : "- No routes have been added.";

  const featuresText =
    project.features.length > 0
      ? project.features
          .map(
            (item) =>
              `- ${item.feature_name} [${
                item.priority || "Standard"
              }]`
          )
          .join("\n")
      : "- No features have been added.";

  const databaseText =
    project.databaseTables.length > 0
      ? project.databaseTables
          .map(
            (item) =>
              `- ${item.table_name}: ${
                item.purpose || "Stores application data"
              }`
          )
          .join("\n")
      : "- No database tables have been added.";

  return `
APP NAME:
${project.app_name || "Untitled App"}

APP PURPOSE:
${project.app_description || "Not specified"}

TARGET USERS:
${project.target_users || "Not specified"}

PROBLEM:
Define the primary problem this application solves.

SOLUTION:
${project.app_description || "Not specified"}

USER ROLES:
- Guest
- Registered User
- Administrator

ROUTES:
${routesText}

FEATURES:
${featuresText}

DATABASE:
${databaseText}

AI ASSISTANT:
Shang Tsung — Game Plan Architect

DESIGN:
Responsive, accessible, modern and professional interface.

SECURITY:
Authentication, authorization, server-side ownership checks,
secure API routes and validated input.

MONETIZATION:
${project.business_model || "To be determined"}

MVP:
Core routes, primary features, database foundation and secure access.

FUTURE:
Live application preview, code generation, version history,
deployment tools, analytics and advanced integrations.
`.trim();
}