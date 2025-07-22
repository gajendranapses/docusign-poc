import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { accountDb } from '@/lib/db/database';

export async function POST(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('docusign-poc-auth');
    
    if (!authCookie) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let user;
    try {
      user = JSON.parse(authCookie.value);
    } catch {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return Response.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Set the default account
    const success = accountDb.setDefault(accountId, user.id);

    if (!success) {
      return Response.json({ error: 'Account not found or access denied' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error setting default account:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}