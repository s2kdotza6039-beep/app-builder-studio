import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportModal from "./ExportModal";

export default async function ProjectOverviewPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth");

  const params = await props.params;
  const projectId = params.projectId;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      routes: { orderBy: { sort_order: "asc" } },
      features: true,
      databaseTables: true,
    },
  });

  if (!project) notFound();

  const routesText =
    project.routes.length > 0
      ? project.routes
          .map((r) => `- ${r.page_name} (${r.route_path}) -> ${r.purpose || "General page"}`)
          .join("\n")
      : "- (No routes yet)";

  const featuresText =
    project.features.length > 0
      ? project.features
          .map((f) => `- ${f.feature_name} [${f.priority || "Standard"}]`)
          .join("\n")
      : "- (No features yet)";

  const databaseText =
    project.databaseTables.length > 0
      ? project.databaseTables
          .map((t) => `- ${t.table_name}: ${t.purpose || "Stores app data"}`)
          .join("\n")
      : "- (No tables yet)";

  const gamePlan = `
APP NAME: ${project.app_name || "Untitled App"}

APP PURPOSE: ${project.app_description || "Not specified"}

TARGET USERS: ${project.target_users || "Not specified"}

PROBLEM:
[Define the core problem this app solves]

SOLUTION:
${project.app_description || "Not specified"}

USER ROLES:
Guest, Registered User, Admin

ROUTES:
${routesText}

FEATURES:
${featuresText}

DATABASE:
${databaseText}

AI FEATURES: Shang Tsung (Game Planning)

DESIGN STYLE:
Clean, modern, professional dark-mode ready UI

SECURITY:
Role-based access, secure API routes, data validation, authenticated actions

MONETIZATION:
${project.business_model || "To be determined"}

MVP VERSION:
Core routes, user authentication, primary features, basic database structure

FUTURE VERSION:
Advanced analytics, third-party integrations, scaling infrastructure, premium features
`.trim();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
          &larr; Back to Dashboard
        </Link>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{project.app_name}</h1>
            <p className="mt-2 text-slate-400">{project.app_description}</p>
          </div>

          <ExportModal gamePlan={gamePlan} />
        </div>

        <div className="mt-10 grid gap-8">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold mb-4">Proposed Pages (Routes)</h2>
            <div className="grid gap-3">
              {project.routes.map((route) => (
                <div key={route.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="font-bold">{route.page_name}</p>
                  <p className="text-xs text-slate-500">{route.route_path}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold mb-4">Core Features</h2>
            <div className="grid grid-cols-2 gap-3">
              {project.features.map((feature) => (
                <div key={feature.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-white">{feature.feature_name}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold mb-4">Database Structure</h2>
            <div className="grid grid-cols-2 gap-3">
              {project.databaseTables.map((table) => (
                <div key={table.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="font-bold text-emerald-400">{table.table_name}</p>
                  <p className="text-xs text-slate-500 mt-1">{table.purpose}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}