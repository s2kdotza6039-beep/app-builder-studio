import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ForgeWorkspace from "./ForgeWorkspace";

export default async function ForgePage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth");
  }

  const { projectId } = await props.params;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    redirect("/auth");
  }

  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase() || "";
  const currentEmail = currentUser.email?.trim().toLowerCase() || "";

  const canAccessAnyProject =
    currentUser.role === "ADMIN" ||
    (founderEmail !== "" && currentEmail === founderEmail);

  const project = await prisma.project.findFirst({
    where: canAccessAnyProject
      ? { id: projectId }
      : { id: projectId, user_id: currentUser.id },
    include: {
      files: { orderBy: { file_path: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/builder/${projectId}/overview`}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            ← Back to Planning
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="font-bold text-lg text-white">
            {project.app_name || "Untitled Project"}
          </h1>
        </div>

        <div className="text-xs font-mono text-emerald-400">STAGE 2: THE FORGE</div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ForgeWorkspace
          projectId={projectId}
          projectName={project.app_name || "My App"}
          initialFiles={project.files}
        />
      </div>
    </main>
  );
}