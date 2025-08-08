import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next();

  // ✅ Set global CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Headers", "*");

  // ✅ Handle OPTIONS preflight requests for CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // 🔒 Your existing auth logic below
  const publicPaths = [
    "/login",
    "/api/auth/login",
    "/api/health",
    "/api/docusign/callback",
  ];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) return response;

  if (pathname.startsWith("/api/")) {
    const host = request.headers.get("host");
    const referer = request.headers.get("referer");
    const origin = request.headers.get("origin");

    const isInternalRequest =
      (referer && referer.includes(host || "")) ||
      (origin && origin.includes(host || "")) ||
      request.headers.get("x-nextjs-data") !== null ||
      request.headers.get("next-router-prefetch") !== null ||
      request.headers.get("next-router-state-tree") !== null;

    const authHeader = request.headers.get("x-api-key");
    const apiKey = process.env.API_SECRET_KEY;
    const hasValidApiKey = authHeader && authHeader === apiKey;

    if (isInternalRequest || hasValidApiKey) return response;

    return new NextResponse(
      JSON.stringify({ error: "Unauthorized - Invalid API Key" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      }
    );
  }

  const authCookie = request.cookies.get("docusign-poc-auth");
  if (!authCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    JSON.parse(authCookie.value);
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
