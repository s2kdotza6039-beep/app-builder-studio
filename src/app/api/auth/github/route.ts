import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";

    const githubClientId = process.env.GITHUB_CLIENT_ID;

    if (!githubClientId) {
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

    // Build the GitHub OAuth URL
    const params = new URLSearchParams({
      client_id: githubClientId,
      scope: "repo",
      state: projectId, // Pass projectId through the OAuth flow
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/github/callback`,
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(githubAuthUrl);
  } catch (error) {
    console.error("GitHub auth error:", error);
    return NextResponse.json({ error: "GitHub auth failed" }, { status: 500 });
  }
}