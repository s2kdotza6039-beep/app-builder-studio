import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportModal from "./ExportModal";
import RoutesEditor from "./RoutesEditor";
import FeaturesEditor from "./FeaturesEditor";
import DatabaseEditor from "./DatabaseEditor";
import ShangTsung from "./ShangTsung";

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
    <main className="min-h-screen bg-slate-950 text-white relative">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
            &larr; Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="font-bold text-lg">{project.app_name}</h1>
          <span className="text-xs text-slate-500 px-2 py-1 rounded bg-slate-800">
            Stage 1: Planning
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ExportModal gamePlan={gamePlan} />
          <Link
            href={`/builder/${projectId}/forge`}
            className={`rounded-xl px-6 py-3 font-bold transition ${
              project.routes.length > 0 && project.features.length > 0
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
            onClick={(e) => !(project.routes.length > 0 && project.features.length > 0) && e.preventDefault()}
          >
            🔨 Enter The Forge →
          </Link>
        </div>
      </header>

      {/* Collapsible Left Panel (Shang Tsung) */}
      <div
        className="fixed top-[72px] left-0 h-[calc(100vh-72px)] z-40 transition-all duration-300"
        id="shang-tsung-panel"
      >
        <div className="w-[380px] h-full border-r border-slate-800 bg-slate-900 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <h2 className="font-bold text-orange-400 flex items-center gap-2">
              <span>🥋</span> Shang Tsung
            </h2>
            <button
              onClick={() => {
                const panel = document.getElementById("shang-tsung-panel");
                if(panel) panel.style.transform = "translateX(-360px)";
              }}
              className="text-slate-400 hover:text-white text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {/* FIXED: Removed embedded={true} */}
            <ShangTsung projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Slide-In Button */}
      <button
        onClick={() => {
          const panel = document.getElementById("shang-tsung-panel");
          if(panel) panel.style.transform = "translateX(0)";
        }}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 font-semibold text-white shadow-2xl hover:bg-orange-500 transition"
      >
        🥋
      </button>

      {/* Main Content */}
      <section className="ml-0 transition-all duration-300" id="main-content">
        <div className="p-6 bg-slate-950 min-h-[calc(100vh-72px)]">
          {/* Project Header */}
          <div className="mb-6 p-6 rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{project.app_name}</h2>
                <p className="text-slate-400 mb-4">{project.app_description}</p>
              </div>
              {project.routes.length > 0 && project.features.length > 0 ? (
                <div className="text-right">
                  <p className="text-xs text-emerald-400 font-semibold mb-1">✓ READY TO BUILD</p>
                  <p className="text-xs text-slate-500">Click "Enter The Forge" above</p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-xs text-yellow-400 font-semibold mb-1">⚠ NEEDS MORE PLANNING</p>
                  <p className="text-xs text-slate-500">Add routes and features first</p>
                </div>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">
                {project.routes.length} Pages
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-400 border border-purple-800">
                {project.features.length} Features
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                {project.databaseTables.length} Tables
              </span>
            </div>
          </div>

          {/* Editors */}
          <div className="grid gap-6">
            <RoutesEditor projectId={projectId} initialRoutes={project.routes} />
            <FeaturesEditor projectId={projectId} initialFeatures={project.features} />
            <DatabaseEditor projectId={projectId} initialTables={project.databaseTables} />
          </div>

          <div className="h-20" />
        </div>
      </section>
    </main>
  );
}

function generateGamePlan(project: any): string {
  const routesText = project.routes?.length
    ? project.routes.map((r: any) => `- ${r.page_name} (${r.route_path}) -> ${r.purpose || "General page"}`).join("\n")
    : "- (No routes yet)";

  const featuresText = project.features?.length
    ? project.features.map((f: any) => `- ${f.feature_name} [${f.priority || "Standard"}]`).join("\n")
    : "- (No features yet)";

  const databaseText = project.databaseTables?.length
    ? project.databaseTables.map((t: any) => `- ${t.table_name}: ${t.purpose || "Stores app data"}`).join("\n")
    : "- (No tables yet)";

  return `APP NAME: ${project.app_name}\n\nPURPOSE: ${project.app_description}\n\nROUTES:\n${routesText}\n\nFEATURES:\n${featuresText}\n\nDATABASE:\n${databaseText}`;
}