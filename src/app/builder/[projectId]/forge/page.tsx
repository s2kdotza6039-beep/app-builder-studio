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
  if (!session?.user?.email) redirect("/auth");

  const { projectId } = await props.params;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!currentUser) redirect("/auth");

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
      <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={`/builder/${projectId}/overview`} className="shrink-0 text-sm text-slate-400 hover:text-white">
            &larr; Back to Planning
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{project.app_name || "My App"}</h1>
            <p className="truncate text-xs text-slate-500">Stage 2: The Forge</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          BUILDING
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <ForgeWorkspace projectId={projectId} projectName={project.app_name || "My App"} initialFiles={project.files} />
      </div>
    </main>
  );
}