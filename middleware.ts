import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip auth for health check endpoint
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  // Check if the request is for the API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth for requests from the same Next.js app
    // These requests typically come from client-side components or server components
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

    if (isInternalRequest) {
      return NextResponse.next();
    }

    // For external requests, check API key
    const authHeader = request.headers.get('x-api-key');
    const apiKey = process.env.API_SECRET_KEY;

    if (!authHeader || authHeader !== apiKey) {
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
  }

  return NextResponse.next();
}

// Configure the paths that should be matched by the middleware
export const config = {
  matcher: '/api/:path*',
} 