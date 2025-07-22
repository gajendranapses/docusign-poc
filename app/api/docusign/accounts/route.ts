import { NextRequest, NextResponse } from 'next/server';
import { accountDb } from '@/lib/db/database';

// Get all accounts
export async function GET(request: NextRequest) {
  try {
    // Check for API key authentication
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.API_SECRET_KEY;
    
    let userId = 'default';
    
    if (apiKey && apiKey === validApiKey) {
      // API key request - use default user or allow specifying userId in query params
      const queryUserId = request.nextUrl.searchParams.get('userId');
      userId = queryUserId || 'default';
    } else {
      // Web app request - get user from auth cookie
      const authCookie = request.cookies.get('docusign-poc-auth');
      if (!authCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const user = JSON.parse(authCookie.value);
      userId = user.id;
    }
    
    const accounts = accountDb.getAll(userId);
    
    // Don't send tokens to frontend
    const safeAccounts = accounts.map(({ access_token, refresh_token, ...account }) => ({
      ...account,
      id: account.account_id, // Use account_id as id for frontend
      addedAt: new Date(account.created_at! * 1000).toISOString()
    }));
    
    return NextResponse.json(safeAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// Delete account
export async function DELETE(request: NextRequest) {
  try {
    // Check for API key authentication
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.API_SECRET_KEY;
    
    let userId = 'default';
    
    if (apiKey && apiKey === validApiKey) {
      // API key request - use default user or allow specifying userId in query params
      const queryUserId = request.nextUrl.searchParams.get('userId');
      userId = queryUserId || 'default';
    } else {
      // Web app request - get user from auth cookie
      const authCookie = request.cookies.get('docusign-poc-auth');
      if (!authCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const user = JSON.parse(authCookie.value);
      userId = user.id;
    }
    
    const { accountId } = await request.json();
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }
    
    const success = accountDb.delete(accountId, userId);
    
    if (!success) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}