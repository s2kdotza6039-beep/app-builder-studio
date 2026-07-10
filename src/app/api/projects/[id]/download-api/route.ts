import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function createSafeName(value: string | null) {
  return (value || "my-app")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createSafeFilePath(value: string) {
  const filePath = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!filePath || filePath.split("/").includes("..")) return null;
  return filePath;
}

function completePackageJson(content: string, projectName: string) {
  try {
    const packageJson = JSON.parse(content);
    packageJson.name = createSafeName(projectName);
    packageJson.private = true;
    packageJson.scripts = { dev: "next dev", build: "next build", start: "next start", ...(packageJson.scripts || {}) };
    packageJson.dependencies = { next: "^15.0.0", react: "^18.0.0", "react-dom": "^18.0.0", ...(packageJson.dependencies || {}) };
    packageJson.devDependencies = { "@types/node": "^20.0.0", "@types/react": "^18.0.0", "@types/react-dom": "^18.0.0", autoprefixer: "^10.4.20", postcss: "^8.4.47", tailwindcss: "^3.4.0", typescript: "^5.0.0", ...(packageJson.devDependencies || {}) };
    return JSON.stringify(packageJson, null, 2);
  } catch {
    return content;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const { id: projectId } = await context.params;

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

    if (!project || project.files.length === 0) {
      return NextResponse.json(
        { error: "Project not found or no files generated." },
        { status: 404 }
      );
    }

    const projectName = project.app_name || "My App";
    const safeName = createSafeName(projectName);
    const zip = new JSZip();
    const projectFolder = zip.folder(safeName);

    if (projectFolder) {
      for (const file of project.files) {
        const filePath = createSafeFilePath(file.file_path);
        if (filePath) {
          let fileContent = file.content;
          if (filePath === "package.json") {
            fileContent = completePackageJson(file.content, projectName);
          }
          projectFolder.file(filePath, fileContent);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to create download" }, { status: 500 });
  }
}