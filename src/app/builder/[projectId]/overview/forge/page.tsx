import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShangTsung from "../overview/ShangTsung";

export default async function ForgePage(props: {
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      
      {/* LEFT PANEL - SHANG TSUNG + FILES */}
      <div className="w-96 border-r border-slate-800 bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-bold text-orange-400 text-xl">🥋 SHANG TSUNG</h1>
          <p className="text-xs text-slate-500">The Dojo Master • Game Plan Architect</p>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="uppercase text-xs tracking-widest text-slate-500 mb-3">Pages</p>
          {project.routes.map((route) => (
            <div
              key={route.id}
              className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer mb-1"
            >
              {route.page_name}.tsx
            </div>
          ))}
        </div>

        {/* Shang Tsung Chat */}
        <div className="border-t border-slate-700 h-2/5">
          <ShangTsung projectId={projectId} />
        </div>
      </div>

      {/* RIGHT PANEL - LIVE PREVIEW */}
      <div className="flex-1 flex flex-col">
        {/* Browser-like top bar */}
        <div className="h-11 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 bg-slate-900 rounded text-center text-xs py-1 text-slate-400">
            Preview • {project.app_name}
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-slate-100 p-8 overflow-auto flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl min-h-[600px] p-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Live Preview</h2>
            <p className="text-slate-500">
              This is where the built app will appear once Shang Tsung starts generating real code.
            </p>
            <p className="text-xs text-slate-400 mt-8">
              Current status: Mock mode active. Real code generation will be enabled when OpenAI funds are loaded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}