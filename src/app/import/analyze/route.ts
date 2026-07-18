import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Only ZIP files are accepted" }, { status: 400 });
    }

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Use JSZip to extract files
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(uint8Array);

    const extractedFiles: Array<{
      file_path: string;
      content: string;
      language: string;
    }> = [];

    const warnings: string[] = [];

    // Extract relevant files
    const relevantExtensions = [
      ".tsx", ".ts", ".jsx", ".js", ".json",
      ".md", ".css", ".html", ".env.example", ".prisma"
    ];

    const skipPaths = [
      "node_modules/", ".next/", ".git/", "dist/",
      "build/", ".turbo/", "coverage/", ".vercel/"
    ];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      // Skip unwanted paths
      if (skipPaths.some((skip) => relativePath.includes(skip))) continue;

      // Only include relevant file types
      const hasRelevantExt = relevantExtensions.some((ext) =>
        relativePath.toLowerCase().endsWith(ext)
      );
      if (!hasRelevantExt) continue;

      try {
        const content = await zipEntry.async("string");

        // Skip very large files
        if (content.length > 100000) {
          warnings.push(`Skipped large file: ${relativePath}`);
          continue;
        }

        // Detect language
        let language = "text";
        if (relativePath.endsWith(".tsx") || relativePath.endsWith(".jsx")) language = "typescript";
        else if (relativePath.endsWith(".ts")) language = "typescript";
        else if (relativePath.endsWith(".js")) language = "javascript";
        else if (relativePath.endsWith(".json")) language = "json";
        else if (relativePath.endsWith(".css")) language = "css";
        else if (relativePath.endsWith(".md")) language = "markdown";
        else if (relativePath.endsWith(".prisma")) language = "prisma";

        // Clean up path (remove leading folder name from zip)
        const cleanPath = relativePath.includes("/")
          ? relativePath.split("/").slice(1).join("/")
          : relativePath;

        if (cleanPath) {
          extractedFiles.push({
            file_path: cleanPath,
            content,
            language,
          });
        }
      } catch {
        warnings.push(`Could not read: ${relativePath}`);
      }
    }

    if (extractedFiles.length === 0) {
      return NextResponse.json(
        { error: "No readable files found in the ZIP. Make sure it contains source code files." },
        { status: 400 }
      );
    }

    // Analyze the extracted files
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
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

function analyzeProject(
  files: Array<{ file_path: string; content: string; language: string }>,
  warnings: string[]
) {
  const detected_routes: Array<{ page_name: string; route_path: string; purpose: string }> = [];
  const detected_features: Array<{ feature_name: string; priority: string }> = [];
  const detected_tables: Array<{ table_name: string; purpose: string }> = [];

  let app_name = "Imported Project";
  let app_type = "Custom App";
  let app_description = "Imported from existing codebase";
  let framework = "Unknown";

  // Read package.json for metadata
  const packageJson = files.find((f) => f.file_path === "package.json");
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

      if (deps.next) { framework = `Next.js ${deps.next}`; app_type = "Business App"; }
      else if (deps.react) { framework = "React"; app_type = "Business App"; }
      else if (deps.vue) { framework = "Vue.js"; app_type = "Custom App"; }
      else if (deps.express) { framework = "Express.js"; app_type = "Business App"; }

      // Detect features from dependencies
      if (deps["next-auth"] || deps["@auth/core"]) {
        detected_features.push({ feature_name: "User authentication", priority: "Must Have" });
      }
      if (deps.stripe || deps["@stripe/stripe-js"]) {
        detected_features.push({ feature_name: "Payment processing (Stripe)", priority: "Must Have" });
      }
      if (deps.prisma || deps["@prisma/client"]) {
        detected_features.push({ feature_name: "Database integration (Prisma)", priority: "Must Have" });
      }
      if (deps.openai) {
        detected_features.push({ feature_name: "AI integration (OpenAI)", priority: "Must Have" });
      }
      if (deps.nodemailer || deps["@sendgrid/mail"]) {
        detected_features.push({ feature_name: "Email notifications", priority: "Should Have" });
      }
      if (deps.sharp || deps["next-cloudinary"]) {
        detected_features.push({ feature_name: "Image upload and processing", priority: "Should Have" });
      }
    } catch {
      warnings.push("Could not fully parse package.json");
    }
  }

  // Detect routes from Next.js App Router structure
  files.forEach((f) => {
    if (f.file_path.endsWith("/page.tsx") || f.file_path.endsWith("/page.jsx") || f.file_path.endsWith("/page.js")) {
      const routePath = "/" + f.file_path
        .replace(/^(src\/)?app\//, "")
        .replace(/\/page\.(tsx|jsx|js)$/, "")
        .replace(/\[([^\]]+)\]/g, ":$1");

      const segments = routePath.split("/").filter(Boolean);
      const pageName = segments.length > 0
        ? segments[segments.length - 1]
            .replace(/:/g, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Home";

      // Determine purpose from content
      let purpose = `${pageName} page`;
      const lowerContent = f.content.toLowerCase();
      if (lowerContent.includes("dashboard")) purpose = "Main user dashboard";
      else if (lowerContent.includes("login") || lowerContent.includes("signin")) purpose = "User authentication";
      else if (lowerContent.includes("profile")) purpose = "User profile management";
      else if (lowerContent.includes("settings")) purpose = "Application settings";
      else if (lowerContent.includes("admin")) purpose = "Admin control panel";
      else if (lowerContent.includes("checkout")) purpose = "Purchase and checkout";
      else if (lowerContent.includes("marketplace") || lowerContent.includes("shop")) purpose = "Product marketplace";

      if (!detected_routes.find((r) => r.route_path === routePath)) {
        detected_routes.push({
          page_name: pageName === "" ? "Home" : pageName,
          route_path: routePath === "" ? "/" : routePath,
          purpose,
        });
      }
    }
  });

  // Detect database tables from Prisma schema
  const prismaFile = files.find(
    (f) => f.file_path.endsWith(".prisma") || f.file_path.includes("schema.prisma")
  );
  if (prismaFile) {
    const modelMatches = prismaFile.content.matchAll(/model\s+(\w+)\s*\{/g);
    for (const match of modelMatches) {
      const tableName = match[1].toLowerCase();
      detected_tables.push({
        table_name: tableName,
        purpose: `Stores ${tableName} data`,
      });
    }
  }

  // Detect features from file structure
  files.forEach((f) => {
    const path = f.file_path.toLowerCase();
    if (path.includes("upload") || path.includes("storage")) {
      if (!detected_features.find((feat) => feat.feature_name.includes("upload"))) {
        detected_features.push({ feature_name: "File upload system", priority: "Should Have" });
      }
    }
    if (path.includes("notification") || path.includes("socket")) {
      if (!detected_features.find((feat) => feat.feature_name.includes("notif"))) {
        detected_features.push({ feature_name: "Notifications system", priority: "Should Have" });
      }
    }
    if (path.includes("search")) {
      if (!detected_features.find((feat) => feat.feature_name.includes("search"))) {
        detected_features.push({ feature_name: "Search functionality", priority: "Should Have" });
      }
    }
    if (path.includes("analytics") || path.includes("dashboard")) {
      if (!detected_features.find((feat) => feat.feature_name.includes("analytics"))) {
        detected_features.push({ feature_name: "Analytics dashboard", priority: "Should Have" });
      }
    }
  });

  // Determine app type from routes and features
  const allRoutes = detected_routes.map((r) => r.route_path.toLowerCase()).join(" ");
  const allFeatures = detected_features.map((f) => f.feature_name.toLowerCase()).join(" ");

  if (allRoutes.includes("shop") || allRoutes.includes("product") || allRoutes.includes("cart")) {
    app_type = "E-commerce App";
  } else if (allRoutes.includes("course") || allRoutes.includes("lesson")) {
    app_type = "Education App";
  } else if (allRoutes.includes("booking") || allRoutes.includes("appointment")) {
    app_type = "Booking App";
  } else if (allFeatures.includes("marketplace")) {
    app_type = "Marketplace";
  } else if (allFeatures.includes("music") || allRoutes.includes("track") || allRoutes.includes("beat")) {
    app_type = "Music App";
  } else if (allRoutes.includes("dashboard") && detected_tables.length > 3) {
    app_type = "Dashboard";
  }

  // Ensure Home route exists
  if (!detected_routes.find((r) => r.route_path === "/")) {
    detected_routes.unshift({ page_name: "Home", route_path: "/", purpose: "Landing page" });
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