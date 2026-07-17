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
    <main className="flex h-screen flex-col overflow-hidden bg-stone-950 text-stone-100">
      <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-stone-800 bg-stone-900 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={`/builder/${projectId}/overview`}
            className="shrink-0 text-sm text-stone-400 transition hover:text-stone-100"
          >
            &larr; Back to Planning
          </Link>
          <div className="h-5 w-px bg-stone-700" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-stone-100">
              {project.app_name || "My App"}
            </h1>
            <p className="truncate text-xs text-stone-500">Stage 2: The Forge</p>
          </div>
        </div>
        <span className="rounded-full border border-orange-800/50 bg-orange-900/20 px-3 py-1.5 text-xs font-black text-orange-400">
          BUILDING
        </span>
      </header>

      <div className="min-h-0 flex-1">
        <ForgeWorkspace
          projectId={projectId}
          projectName={project.app_name || "My App"}
          initialFiles={project.files}
        />
      </div>
    </main>
  );
}