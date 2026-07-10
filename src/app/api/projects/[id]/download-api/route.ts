import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { id: projectId } = await context.params;

    // Load the project with all its generated files
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user_id: user.id,
      },
      include: {
        files: {
          orderBy: { file_path: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (project.files.length === 0) {
      return NextResponse.json(
        {
          error:
            "No files have been generated yet. Enter The Forge and click Generate Code first.",
        },
        { status: 400 }
      );
    }

    // Create the ZIP archive in memory
    const zip = new JSZip();
    const rootFolder = zip.folder(
      (project.app_name || "my-app")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );

    if (!rootFolder) {
      return NextResponse.json(
        { error: "Failed to create archive" },
        { status: 500 }
      );
    }

    // Add every generated file into the ZIP
    for (const file of project.files) {
      rootFolder.file(file.file_path, file.content);
    }

    // Add boilerplate files that every Next.js project needs
    rootFolder.file(
      "globals.css",
      `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: #ffffff;
  --background: #0a0a0a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
`
    );

    rootFolder.file(
      "tailwind.config.ts",
      `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`
    );

    rootFolder.file(
      "next.config.ts",
      `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`
    );

    rootFolder.file(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [
              {
                name: "next",
              },
            ],
            paths: {
              "@/*": ["./*"],
            },
          },
          include: [
            "**/*.ts",
            "**/*.tsx",
            ".next/types/**/*.ts",
          ],
          exclude: ["node_modules"],
        },
        null,
        2
      )
    );

    rootFolder.file(
      "postcss.config.mjs",
      `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`
    );

    // Generate the ZIP as a binary buffer
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    // Create a safe filename
    const safeName = (project.app_name || "my-app")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Return the ZIP file as a downloadable response
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate download.",
      },
      { status: 500 }
    );
  }
}