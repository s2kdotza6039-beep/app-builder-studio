import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Could not read the uploaded file. Please try again." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are accepted. Please convert your file to ZIP first." },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let JSZip: any;
    try {
      JSZip = (await import("jszip")).default;
    } catch {
      return NextResponse.json(
        { error: "ZIP extraction library not available." },
        { status: 500 }
      );
    }

    let zip: any;
    try {
      zip = await JSZip.loadAsync(uint8Array);
    } catch {
      return NextResponse.json(
        { error: "Could not read the ZIP file. Make sure it is a valid ZIP archive." },
        { status: 400 }
      );
    }

    const extractedFiles: Array<{
      file_path: string;
      content: string;
      language: string;
    }> = [];

    const warnings: string[] = [];

    const relevantExtensions = [
      ".tsx", ".ts", ".jsx", ".js", ".json",
      ".md", ".css", ".html", ".prisma",
    ];

    const skipPaths = [
      "node_modules/", ".next/", ".git/", "dist/",
      "build/", ".turbo/", "coverage/", ".vercel/",
    ];

    for (const [relativePath, zipEntry] of Object.entries(zip.files) as [string, any][]) {
      if (zipEntry.dir) continue;
      if (skipPaths.some((skip) => relativePath.includes(skip))) continue;

      const hasRelevantExt = relevantExtensions.some((ext) =>
        relativePath.toLowerCase().endsWith(ext)
      );
      if (!hasRelevantExt) continue;

      try {
        const content = await zipEntry.async("string");

        if (content.length > 100000) {
          warnings.push(`Skipped large file: ${relativePath}`);
          continue;
        }

        let language = "text";
        if (relativePath.endsWith(".tsx") || relativePath.endsWith(".jsx")) language = "typescript";
        else if (relativePath.endsWith(".ts")) language = "typescript";
        else if (relativePath.endsWith(".js")) language = "javascript";
        else if (relativePath.endsWith(".json")) language = "json";
        else if (relativePath.endsWith(".css")) language = "css";
        else if (relativePath.endsWith(".md")) language = "markdown";
        else if (relativePath.endsWith(".prisma")) language = "prisma";

        // Remove leading zip folder name
        const parts = relativePath.split("/");
        const cleanPath = parts.length > 1 ? parts.slice(1).join("/") : relativePath;

        if (cleanPath && cleanPath.trim()) {
          extractedFiles.push({ file_path: cleanPath, content, language });
        }
      } catch {
        warnings.push(`Could not read: ${relativePath}`);
      }
    }

    if (extractedFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No readable source files found in the ZIP. Make sure it contains .tsx, .ts, .js, or .json files.",
        },
        { status: 400 }
      );
    }

    const analysis = analyzeProject(extractedFiles, warnings);

    return NextResponse.json({
      ...analysis,
      files: extractedFiles,
      file_count: extractedFiles.length,
      warnings,
    });
  } catch (error) {
    console.error("Import analyze error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed. Please try again.",
      },
      { status: 500 }
    );
  }
}

function analyzeProject(
  files: Array<{ file_path: string; content: string; language: string }>,
  warnings: string[]
) {
  const detected_routes: Array<{
    page_name: string;
    route_path: string;
    purpose: string;
  }> = [];

  const detected_features: Array<{
    feature_name: string;
    priority: string;
  }> = [];

  const detected_tables: Array<{
    table_name: string;
    purpose: string;
  }> = [];

  let app_name = "Imported Project";
  let app_type = "Custom App";
  let app_description = "Imported from existing codebase";
  let framework = "Unknown";

  // ── Read package.json ──────────────────────────────────────────────────────
  const packageJson = files.find(
    (f) => f.file_path === "package.json" || f.file_path.endsWith("/package.json")
  );

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);

      if (pkg.name) {
        app_name = pkg.name
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }

      if (pkg.description) app_description = pkg.description;

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.next) {
        framework = `Next.js ${deps.next.replace(/[\^~]/, "")}`;
        app_type = "Business App";
      } else if (deps.react) {
        framework = "React";
        app_type = "Business App";
      } else if (deps.vue) {
        framework = "Vue.js";
        app_type = "Custom App";
      } else if (deps.express) {
        framework = "Express.js";
        app_type = "Business App";
      }

      // Features from dependencies
      if (deps["next-auth"] || deps["@auth/core"]) {
        detected_features.push({
          feature_name: "User authentication",
          priority: "Must Have",
        });
      }
      if (deps.stripe || deps["@stripe/stripe-js"]) {
        detected_features.push({
          feature_name: "Payment processing (Stripe)",
          priority: "Must Have",
        });
      }
      if (deps.prisma || deps["@prisma/client"]) {
        detected_features.push({
          feature_name: "Database integration (Prisma)",
          priority: "Must Have",
        });
      }
      if (deps.openai) {
        detected_features.push({
          feature_name: "AI integration (OpenAI)",
          priority: "Must Have",
        });
      }
      if (deps.nodemailer || deps["@sendgrid/mail"]) {
        detected_features.push({
          feature_name: "Email notifications",
          priority: "Should Have",
        });
      }
      if (deps.sharp || deps["next-cloudinary"]) {
        detected_features.push({
          feature_name: "Image upload and processing",
          priority: "Should Have",
        });
      }
      if (deps.socket || deps["socket.io"]) {
        detected_features.push({
          feature_name: "Real-time features (WebSockets)",
          priority: "Should Have",
        });
      }
    } catch {
      warnings.push("Could not fully parse package.json");
    }
  }

  // ── Detect routes from Next.js App Router ─────────────────────────────────
  files.forEach((f) => {
    const isPageFile =
      f.file_path.endsWith("/page.tsx") ||
      f.file_path.endsWith("/page.jsx") ||
      f.file_path.endsWith("/page.js") ||
      f.file_path === "page.tsx" ||
      f.file_path === "page.jsx";

    if (!isPageFile) return;

    const routePath =
      "/" +
      f.file_path
        .replace(/^(src\/)?app\//, "")
        .replace(/\/page\.(tsx|jsx|js)$/, "")
        .replace(/^page\.(tsx|jsx|js)$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1");

    const segments = routePath.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";

    const pageName =
      lastSegment === ""
        ? "Home"
        : lastSegment
            .replace(/:/g, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const lowerContent = f.content.toLowerCase();
    let purpose = `${pageName} page`;
    if (lowerContent.includes("dashboard")) purpose = "Main user dashboard";
    else if (lowerContent.includes("signin") || lowerContent.includes("login")) purpose = "User authentication";
    else if (lowerContent.includes("profile")) purpose = "User profile management";
    else if (lowerContent.includes("settings")) purpose = "Application settings";
    else if (lowerContent.includes("admin")) purpose = "Admin control panel";
    else if (lowerContent.includes("checkout")) purpose = "Purchase and checkout";
    else if (lowerContent.includes("marketplace") || lowerContent.includes("shop")) purpose = "Product marketplace";
    else if (lowerContent.includes("upload")) purpose = "File upload page";
    else if (lowerContent.includes("analytics")) purpose = "Analytics and reporting";

    const cleanRoute = routePath === "" ? "/" : routePath;

    if (!detected_routes.find((r) => r.route_path === cleanRoute)) {
      detected_routes.push({
        page_name: pageName === "" ? "Home" : pageName,
        route_path: cleanRoute,
        purpose,
      });
    }
  });

  // ── Detect database tables from Prisma ────────────────────────────────────
  const prismaFile = files.find(
    (f) =>
      f.file_path.endsWith(".prisma") ||
      f.file_path.includes("schema.prisma")
  );

  if (prismaFile) {
    const modelMatches = [...prismaFile.content.matchAll(/model\s+(\w+)\s*\{/g)];
    for (const match of modelMatches) {
      const modelName = match[1];
      const tableName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      detected_tables.push({
        table_name: tableName,
        purpose: `Stores ${tableName} data`,
      });
    }
  }

  // ── Detect features from file names and content ───────────────────────────
  files.forEach((f) => {
    const path = f.file_path.toLowerCase();
    const content = f.content.toLowerCase();

    if ((path.includes("upload") || content.includes("formdata")) &&
      !detected_features.find((feat) => feat.feature_name.includes("upload"))) {
      detected_features.push({ feature_name: "File upload system", priority: "Should Have" });
    }
    if ((path.includes("notification") || path.includes("socket")) &&
      !detected_features.find((feat) => feat.feature_name.includes("notif"))) {
      detected_features.push({ feature_name: "Notifications system", priority: "Should Have" });
    }
    if (path.includes("search") &&
      !detected_features.find((feat) => feat.feature_name.includes("search"))) {
      detected_features.push({ feature_name: "Search functionality", priority: "Should Have" });
    }
    if ((path.includes("analytics") || path.includes("dashboard")) &&
      !detected_features.find((feat) => feat.feature_name.includes("analytics"))) {
      detected_features.push({ feature_name: "Analytics dashboard", priority: "Should Have" });
    }
    if (path.includes("report") &&
      !detected_features.find((feat) => feat.feature_name.includes("report"))) {
      detected_features.push({ feature_name: "Reports and exports", priority: "Future" });
    }
  });

  // ── Determine app type from routes and features ───────────────────────────
  const allRoutes = detected_routes.map((r) => r.route_path.toLowerCase()).join(" ");
  const allFeatures = detected_features.map((f) => f.feature_name.toLowerCase()).join(" ");

  if (allRoutes.includes("shop") || allRoutes.includes("product") || allRoutes.includes("cart")) {
    app_type = "E-commerce App";
  } else if (allRoutes.includes("course") || allRoutes.includes("lesson")) {
    app_type = "Education App";
  } else if (allRoutes.includes("booking") || allRoutes.includes("appointment")) {
    app_type = "Booking App";
  } else if (allFeatures.includes("marketplace") || allRoutes.includes("marketplace")) {
    app_type = "Marketplace";
  } else if (allRoutes.includes("track") || allRoutes.includes("beat") || allRoutes.includes("music")) {
    app_type = "Music App";
  } else if (allRoutes.includes("dashboard") && detected_tables.length > 3) {
    app_type = "Dashboard";
  } else if (allFeatures.includes("community") || allRoutes.includes("community")) {
    app_type = "Community App";
  }

  // Ensure Home route exists
  if (!detected_routes.find((r) => r.route_path === "/")) {
    detected_routes.unshift({
      page_name: "Home",
      route_path: "/",
      purpose: "Landing page",
    });
  }

  return {
    app_name,
    app_type,
    app_description,
    framework,
    detected_routes,
    detected_features,
    detected_tables,
  };
}