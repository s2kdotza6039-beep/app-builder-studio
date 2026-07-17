import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const USE_MOCK = true; // ← Change to false when OpenAI funds arrive

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { idea, mode } = await request.json();

    if (!idea?.trim()) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 });
    }

    let project;

    if (USE_MOCK) {
      project = generateMockStructure(idea);
    } else {
      project = await generateAIStructure(idea);
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Brain dump structure error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to structure idea" },
      { status: 500 }
    );
  }
}

function generateMockStructure(idea: string) {
  const lower = idea.toLowerCase();

  // Detect app type from keywords
  let appType = "Business App";
  if (lower.includes("music") || lower.includes("beat") || lower.includes("sound") || lower.includes("artist")) appType = "Music App";
  else if (lower.includes("store") || lower.includes("sell") || lower.includes("buy") || lower.includes("shop") || lower.includes("checkout")) appType = "E-commerce App";
  else if (lower.includes("marketplace") || lower.includes("license")) appType = "Marketplace";
  else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) appType = "Booking App";
  else if (lower.includes("learn") || lower.includes("course") || lower.includes("education") || lower.includes("teach")) appType = "Education App";
  else if (lower.includes("community") || lower.includes("social") || lower.includes("connect") || lower.includes("network")) appType = "Community App";
  else if (lower.includes("finance") || lower.includes("money") || lower.includes("payment") || lower.includes("invoice")) appType = "Finance App";
  else if (lower.includes("health") || lower.includes("fitness") || lower.includes("workout")) appType = "Health/Fitness App";
  else if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("track")) appType = "Dashboard";

  // Extract a short name from the idea
  const words = idea.trim().split(" ").slice(0, 5);
  const appName = generateAppName(idea, appType);

  // Generate relevant routes based on type
  const routes = generateRoutes(appType, lower);

  // Generate relevant features
  const features = generateFeatures(appType, lower);

  // Generate database tables
  const tables = generateTables(appType, lower);

  return {
    app_name: appName,
    app_type: appType,
    app_description: generateDescription(idea, appType),
    target_users: generateTargetUsers(appType, lower),
    business_model: generateBusinessModel(appType, lower),
    routes,
    features,
    database_tables: tables,
  };
}

function generateAppName(idea: string, appType: string): string {
  const lower = idea.toLowerCase();

  if (lower.includes("beat")) return "BeatVault Pro";
  if (lower.includes("music") && lower.includes("license")) return "SoundLicense";
  if (lower.includes("music")) return "MusicFlow";
  if (lower.includes("artist")) return "ArtistHub";
  if (lower.includes("store") || lower.includes("shop")) return "ShopFlow";
  if (lower.includes("course") || lower.includes("learn")) return "LearnFlow";
  if (lower.includes("book") || lower.includes("appointment")) return "BookEase";
  if (lower.includes("community") || lower.includes("social")) return "ConnectHub";
  if (lower.includes("finance") || lower.includes("invoice")) return "FinanceCore";
  if (lower.includes("health") || lower.includes("fitness")) return "FitTrack";
  return `${appType.split(" ")[0]}Pro`;
}

function generateDescription(idea: string, appType: string): string {
  const sentences = idea.split(/[.!?]/);
  const first = sentences[0]?.trim();
  if (first && first.length > 20 && first.length < 150) return first;
  return `A powerful ${appType.toLowerCase()} built to solve real problems for real users.`;
}

function generateTargetUsers(appType: string, lower: string): string {
  if (lower.includes("musician") || lower.includes("artist") || lower.includes("beat")) return "Musicians, producers, and music creators";
  if (lower.includes("student") || lower.includes("learn")) return "Students and lifelong learners";
  if (lower.includes("business") || lower.includes("company")) return "Small to medium business owners";
  if (lower.includes("freelance")) return "Freelancers and independent contractors";
  if (appType === "E-commerce App") return "Online shoppers and retail businesses";
  if (appType === "Community App") return "Community members and social networkers";
  if (appType === "Health/Fitness App") return "Health-conscious individuals and fitness enthusiasts";
  return "Entrepreneurs and professionals";
}

function generateBusinessModel(appType: string, lower: string): string {
  if (lower.includes("commission") || lower.includes("marketplace")) return "Commission per transaction";
  if (lower.includes("subscription") || lower.includes("monthly")) return "Monthly subscription (Freemium)";
  if (lower.includes("license") || lower.includes("sell")) return "Per-license fee + subscription";
  if (appType === "Education App") return "Course sales + subscription";
  if (appType === "Booking App") return "Commission per booking";
  return "Freemium with Pro subscription";
}

function generateRoutes(appType: string, lower: string) {
  const base = [
    { page_name: "Home", route_path: "/", purpose: "Landing page and value proposition" },
    { page_name: "Login", route_path: "/auth", purpose: "User authentication" },
    { page_name: "Dashboard", route_path: "/dashboard", purpose: "User control center" },
    { page_name: "Settings", route_path: "/settings", purpose: "Account and app preferences" },
  ];

  if (appType === "Marketplace" || lower.includes("license") || lower.includes("beat")) {
    return [
      ...base,
      { page_name: "Marketplace", route_path: "/marketplace", purpose: "Browse and search listings" },
      { page_name: "Artist Profile", route_path: "/artist/[id]", purpose: "Individual artist page" },
      { page_name: "Checkout", route_path: "/checkout", purpose: "Purchase and licensing" },
      { page_name: "My Uploads", route_path: "/my-uploads", purpose: "Manage uploaded content" },
    ];
  }

  if (appType === "E-commerce App") {
    return [
      ...base,
      { page_name: "Products", route_path: "/products", purpose: "Browse product catalog" },
      { page_name: "Product Detail", route_path: "/products/[id]", purpose: "Individual product page" },
      { page_name: "Cart", route_path: "/cart", purpose: "Shopping cart" },
      { page_name: "Checkout", route_path: "/checkout", purpose: "Order and payment" },
      { page_name: "Orders", route_path: "/orders", purpose: "Order history" },
    ];
  }

  if (appType === "Education App") {
    return [
      ...base,
      { page_name: "Courses", route_path: "/courses", purpose: "Browse available courses" },
      { page_name: "Course Detail", route_path: "/courses/[id]", purpose: "Course overview and enroll" },
      { page_name: "Lesson", route_path: "/lesson/[id]", purpose: "Active lesson view" },
      { page_name: "Progress", route_path: "/progress", purpose: "Track learning progress" },
    ];
  }

  if (appType === "Booking App") {
    return [
      ...base,
      { page_name: "Services", route_path: "/services", purpose: "Browse available services" },
      { page_name: "Book", route_path: "/book/[id]", purpose: "Make a booking" },
      { page_name: "My Bookings", route_path: "/bookings", purpose: "Manage bookings" },
      { page_name: "Calendar", route_path: "/calendar", purpose: "Availability calendar" },
    ];
  }

  if (appType === "Music App") {
    return [
      ...base,
      { page_name: "Library", route_path: "/library", purpose: "Music library and player" },
      { page_name: "Discover", route_path: "/discover", purpose: "Find new music and artists" },
      { page_name: "Upload", route_path: "/upload", purpose: "Upload tracks and albums" },
      { page_name: "Analytics", route_path: "/analytics", purpose: "Play counts and revenue" },
    ];
  }

  return [
    ...base,
    { page_name: "Profile", route_path: "/profile", purpose: "User profile page" },
    { page_name: "Notifications", route_path: "/notifications", purpose: "User notifications" },
  ];
}

function generateFeatures(appType: string, lower: string) {
  const base = [
    { feature_name: "User authentication and profiles", priority: "Must Have" },
    { feature_name: "Responsive dashboard", priority: "Must Have" },
    { feature_name: "Notifications system", priority: "Should Have" },
    { feature_name: "Settings and preferences", priority: "Should Have" },
  ];

  if (appType === "Marketplace" || lower.includes("beat") || lower.includes("license")) {
    return [
      ...base,
      { feature_name: "File upload system", priority: "Must Have" },
      { feature_name: "Audio player", priority: "Must Have" },
      { feature_name: "Licensing and checkout", priority: "Must Have" },
      { feature_name: "Artist dashboard with analytics", priority: "Must Have" },
      { feature_name: "Search and filter", priority: "Should Have" },
      { feature_name: "Revenue tracking", priority: "Should Have" },
    ];
  }

  if (appType === "E-commerce App") {
    return [
      ...base,
      { feature_name: "Product catalog", priority: "Must Have" },
      { feature_name: "Shopping cart", priority: "Must Have" },
      { feature_name: "Payment processing", priority: "Must Have" },
      { feature_name: "Order management", priority: "Must Have" },
      { feature_name: "Inventory tracking", priority: "Should Have" },
    ];
  }

  if (appType === "Education App") {
    return [
      ...base,
      { feature_name: "Course creation and management", priority: "Must Have" },
      { feature_name: "Video lesson player", priority: "Must Have" },
      { feature_name: "Progress tracking", priority: "Must Have" },
      { feature_name: "Assignments and submissions", priority: "Should Have" },
      { feature_name: "Certificates", priority: "Future" },
    ];
  }

  return [
    ...base,
    { feature_name: "Search and filtering", priority: "Should Have" },
    { feature_name: "Data export", priority: "Future" },
  ];
}

function generateTables(appType: string, lower: string) {
  const base = [
    { table_name: "users", purpose: "Stores user accounts and profiles" },
    { table_name: "notifications", purpose: "Stores user notifications" },
    { table_name: "activity_logs", purpose: "Tracks user activity" },
  ];

  if (appType === "Marketplace" || lower.includes("beat") || lower.includes("license")) {
    return [
      ...base,
      { table_name: "listings", purpose: "Uploaded beats and files for sale" },
      { table_name: "licenses", purpose: "Purchased licenses and terms" },
      { table_name: "transactions", purpose: "Payment and revenue records" },
      { table_name: "plays", purpose: "Play count and streaming analytics" },
    ];
  }

  if (appType === "E-commerce App") {
    return [
      ...base,
      { table_name: "products", purpose: "Product catalog and inventory" },
      { table_name: "orders", purpose: "Customer orders and status" },
      { table_name: "payments", purpose: "Payment records" },
      { table_name: "reviews", purpose: "Product reviews and ratings" },
    ];
  }

  if (appType === "Education App") {
    return [
      ...base,
      { table_name: "courses", purpose: "Course metadata and structure" },
      { table_name: "lessons", purpose: "Individual lesson content" },
      { table_name: "enrollments", purpose: "User course enrollments" },
      { table_name: "progress", purpose: "Lesson completion tracking" },
    ];
  }

  return [
    ...base,
    { table_name: "projects", purpose: "User project data" },
    { table_name: "settings", purpose: "User preferences" },
  ];
}

// ─── REAL AI VERSION ──────────────────────────────────────────────────────────

async function generateAIStructure(idea: string) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Shang Tsung inside App Builder Studio by S2KDOTZA Entertainment.
The user has given you a raw idea dump. Structure it into a complete app plan.
Respond with ONLY valid JSON:
{
  "app_name": "Short professional name",
  "app_type": "Business App | Marketplace | Music App | E-commerce App | Education App | Booking App | Community App | Finance App | Health/Fitness App | Dashboard | Custom App",
  "app_description": "One clear sentence describing what the app does",
  "target_users": "Who the app is for",
  "business_model": "How the app makes money",
  "routes": [{ "page_name": "string", "route_path": "/path", "purpose": "string" }],
  "features": [{ "feature_name": "string", "priority": "Must Have | Should Have | Future" }],
  "database_tables": [{ "table_name": "string", "purpose": "string" }]
}
Be practical. Focus on MVP. Max 8 routes, 8 features, 6 tables.`,
      },
      { role: "user", content: idea },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0]?.message?.content || "{}");
}