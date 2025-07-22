import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { accountDb, getAccountByAccountId } from '@/lib/db/database';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    
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

    // Verify the account belongs to this user
    const account = getAccountByAccountId(accountId, user.id);
    if (!account) {
      return Response.json({ error: 'Account not found or access denied' }, { status: 404 });
    }

    // Delete the account
    const success = accountDb.delete(accountId, user.id);

    if (!success) {
      return Response.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}