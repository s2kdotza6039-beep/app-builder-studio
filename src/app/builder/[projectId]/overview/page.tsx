import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportModal from "./ExportModal";
import RoutesEditor from "./RoutesEditor";
import FeaturesEditor from "./FeaturesEditor";
import DatabaseEditor from "./DatabaseEditor";

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

  const gamePlan = generateGamePlan(project);

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
          <RoutesEditor projectId={projectId} initialRoutes={project.routes} />
          <FeaturesEditor projectId={projectId} initialFeatures={project.features} />
          <DatabaseEditor projectId={projectId} initialTables={project.databaseTables} />
        </div>
      </div>
    </main>
  );
}

function generateGamePlan(project: any): string {
  const routesText = project.routes?.length
    ? project.routes
        .map((r: any) => `- ${r.page_name} (${r.route_path}) -> ${r.purpose || "General page"}`)
        .join("\n")
    : "- (No routes yet)";

  const featuresText = project.features?.length
    ? project.features
        .map((f: any) => `- ${f.feature_name} [${f.priority || "Standard"}]`)
        .join("\n")
    : "- (No features yet)";

  const databaseText = project.databaseTables?.length
    ? project.databaseTables
        .map((t: any) => `- ${t.table_name}: ${t.purpose || "Stores app data"}`)
        .join("\n")
    : "- (No tables yet)";

  return `
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
}