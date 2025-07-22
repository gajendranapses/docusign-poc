import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { accountDb } from '@/lib/db/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    
    // Get user from cookie
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('docusign-poc-auth');
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let user;
    try {
      user = JSON.parse(authCookie.value);
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const success = await accountDb.setDefault(accountId, user.id);
    
    if (!success) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting default account:', error);
    return NextResponse.json({ error: 'Failed to set default account' }, { status: 500 });
  }
}