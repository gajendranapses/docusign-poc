import { NextRequest, NextResponse } from 'next/server';
import { DOCUSIGN_OAUTH_CONFIG } from '@/lib/api-services/docusign/oauth-config';
import { accountDb } from '@/lib/db/database';

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/?error=oauth_denied`);
    }
    
    // Validate state for CSRF protection
    const storedState = request.cookies.get('docusign_oauth_state')?.value;
    if (!state || state !== storedState) {
      console.error('State mismatch');
      return NextResponse.redirect(`${baseUrl}/?error=invalid_state`);
    }
    
    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(`${baseUrl}/?error=no_code`);
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(DOCUSIGN_OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${DOCUSIGN_OAUTH_CONFIG.clientId}:${DOCUSIGN_OAUTH_CONFIG.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DOCUSIGN_OAUTH_CONFIG.redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userInfoResponse = await fetch(DOCUSIGN_OAUTH_CONFIG.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(`${baseUrl}/?error=userinfo_failed`);
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Extract account information
    // DocuSign returns accounts array, we'll use the first one or let user choose
    const account = userInfo.accounts[0];
    
    // Get user from auth cookie
    const authCookie = request.cookies.get('docusign-poc-auth');
    let userId = 'default';
    
    if (authCookie) {
      try {
        const user = JSON.parse(authCookie.value);
        userId = user.id;
      } catch (error) {
        console.error('Failed to parse auth cookie:', error);
      }
    }
    
    // Store the account and tokens in database
    await accountDb.upsert({
      user_id: userId,
      email: userInfo.email,
      name: userInfo.name,
      account_id: account.account_id,
      account_name: account.account_name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      is_default: false // Will be set to true automatically if this is the first account
    });
    
    // Get the return URL from cookie
    const returnUrl = request.cookies.get('docusign_return_url')?.value || '/';
    const redirectUrl = `${baseUrl}${returnUrl}?success=account_connected&showSettings=true`;
    
    // Clear the cookies and redirect
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('docusign_oauth_state');
    response.cookies.delete('docusign_return_url');
    
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/?error=oauth_callback_failed`);
  }
}