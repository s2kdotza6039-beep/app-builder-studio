import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const projectId = searchParams.get("state") || "";
    const error = searchParams.get("error");

    if (error) {
      const redirectUrl = projectId
        ? `/builder/${projectId}/forge?github=denied`
        : "/dashboard?github=denied";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/dashboard?github=error", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/github/callback`,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("GitHub token error:", tokenData);
      const redirectUrl = projectId
        ? `/builder/${projectId}/forge?github=error`
        : "/dashboard?github=error";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    // Save token to user record
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        github_token: accessToken,
        github_username: githubUser.login || null,
        github_connected: true,
      },
    });

    // Redirect back to forge with success
    const redirectUrl = projectId
      ? `/builder/${projectId}/forge?github=connected`
      : "/dashboard?github=connected";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(new URL("/dashboard?github=error", request.url));
  }
}