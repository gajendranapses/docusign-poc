import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAccountByAccountId, getAllAccountsByUser, getDefaultAccount } from '@/lib/db/database';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const requestedAccountId = searchParams.get('accountId');

    // Get the appropriate DocuSign account
    let docusignAccount;
    if (requestedAccountId) {
      docusignAccount = await getAccountByAccountId(requestedAccountId, user.id);
    } else {
      docusignAccount = await getDefaultAccount(user.id);
    }

    if (!docusignAccount) {
      // Check if user has any accounts at all
      const userAccounts = await getAllAccountsByUser(user.id);
      if (userAccounts.length === 0) {
        return Response.json({ 
          error: 'No DocuSign accounts connected',
          code: 'NO_ACCOUNTS',
          accounts: []
        }, { status: 400 });
      } else {
        return Response.json({ 
          error: 'Specified DocuSign account not found',
          code: 'ACCOUNT_NOT_FOUND',
          accounts: userAccounts.map(acc => ({
            accountId: acc.account_id,
            email: acc.email,
            isDefault: acc.is_default
          }))
        }, { status: 400 });
      }
    }

    // Fetch envelopes from DocuSign (last 30 days)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const fromDateStr = fromDate.toISOString();

    const response = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${docusignAccount.account_id}/envelopes?status=sent,delivered,completed,signed&count=50&order_by=created&order=desc&from_date=${fromDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${docusignAccount.access_token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ 
          error: 'DocuSign token expired. Please reconnect your account.',
          code: 'TOKEN_EXPIRED'
        }, { status: 401 });
      }
      const errorText = await response.text();
      throw new Error(`DocuSign API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Get all accounts for the dropdown
    const allAccounts = await getAllAccountsByUser(user.id);
    
    return Response.json({
      envelopes: data.envelopes || [],
      totalResults: data.totalSetSize || 0,
      currentAccount: {
        accountId: docusignAccount.account_id,
        email: docusignAccount.email,
        isDefault: docusignAccount.is_default
      },
      availableAccounts: allAccounts.map(acc => ({
        accountId: acc.account_id,
        email: acc.email,
        isDefault: acc.is_default
      }))
    });
  } catch (error) {
    console.error('Error fetching envelopes:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}