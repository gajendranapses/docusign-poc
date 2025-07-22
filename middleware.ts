import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public paths that don't require any authentication
  const publicPaths = ['/login', '/api/auth/login', '/api/health', '/api/docusign/callback'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Handle API routes first (before cookie authentication)
  if (pathname.startsWith('/api/')) {
    // Skip auth for requests from the same Next.js app
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    // Check if request is from the same origin
    const isInternalRequest = (
      (referer && referer.includes(host || '')) ||
      (origin && origin.includes(host || '')) ||
      // Next.js internal requests often have these headers
      request.headers.get('x-nextjs-data') !== null ||
      request.headers.get('next-router-prefetch') !== null ||
      request.headers.get('next-router-state-tree') !== null
    );

    // Check for API key authentication
    const authHeader = request.headers.get('x-api-key');
    const apiKey = process.env.API_SECRET_KEY;
    const hasValidApiKey = authHeader && authHeader === apiKey;

    // Allow API access if:
    // 1. Internal request (from same origin)
    // 2. Valid API key provided
    if (isInternalRequest || hasValidApiKey) {
      return NextResponse.next();
    }

    // For external requests without valid API key, deny access
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized - Invalid API Key' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Check user authentication for non-API, non-public pages
  const authCookie = request.cookies.get('docusign-poc-auth');
  
  if (!authCookie) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  try {
    // Validate cookie content
    JSON.parse(authCookie.value);
  } catch {
    // Invalid cookie, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure the paths that should be matched by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 