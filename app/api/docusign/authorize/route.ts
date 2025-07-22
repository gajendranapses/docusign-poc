import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizationUrl, DOCUSIGN_OAUTH_CONFIG } from '@/lib/api-services/docusign/oauth-config';

export async function GET(request: NextRequest) {
  try {
    // Get the return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/';
    
    // Generate state for CSRF protection
    const state = DOCUSIGN_OAUTH_CONFIG.generateState();
    
    // Store state in a cookie for validation in callback
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set('docusign_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });
    
    // Store return URL in a cookie
    response.cookies.set('docusign_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Error initiating DocuSign OAuth:', error);
    // Get the origin from headers since we don't have request object here
    const origin = process.env.NEXT_APP_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/envelope?error=oauth_init_failed`);
  }
}