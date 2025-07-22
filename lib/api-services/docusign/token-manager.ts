import { DOCUSIGN_OAUTH_CONFIG } from './oauth-config';
import { accountDb, DocuSignAccount } from '@/lib/db/database';

/**
 * Checks if token is expired or about to expire
 * @param expiresAt Unix timestamp in seconds
 * @returns true if token expires in less than 5 minutes
 */
function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 5 * 60; // 5 minutes buffer
  return now >= (expiresAt - bufferTime);
}

/**
 * Refreshes the access token using the refresh token
 */
async function refreshAccessToken(account: DocuSignAccount): Promise<DocuSignAccount | null> {
  try {
    const response = await fetch(DOCUSIGN_OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${DOCUSIGN_OAUTH_CONFIG.clientId}:${DOCUSIGN_OAUTH_CONFIG.clientSecret}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token
      })
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const tokens = await response.json();

    // Update tokens in database
    const success = await accountDb.updateTokens(
      account.account_id,
      tokens.access_token,
      tokens.refresh_token || account.refresh_token, // Sometimes refresh token doesn't change
      tokens.expires_in
    );

    if (!success) {
      console.error('Failed to update tokens in database');
      return null;
    }

    // Return updated account
    return await accountDb.getByAccountId(account.account_id);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Gets a valid access token for the account, refreshing if necessary
 */
export async function getValidAccessToken(accountId: string): Promise<string | null> {
  const account = await accountDb.getByAccountId(accountId);
  
  if (!account) {
    console.error('Account not found:', accountId);
    return null;
  }

  // Check if token is expired
  if (isTokenExpired(account.expires_at)) {
    console.log('Token expired, refreshing...');
    const refreshedAccount = await refreshAccessToken(account);
    
    if (!refreshedAccount) {
      console.error('Failed to refresh token');
      // Token refresh failed - user needs to re-authenticate
      // In production, you might want to notify the user
      return null;
    }
    
    return refreshedAccount.access_token;
  }

  return account.access_token;
}

/**
 * Gets the default account's valid access token
 */
export async function getDefaultAccountToken(userId: string = 'default'): Promise<string | null> {
  const account = await accountDb.getDefault(userId);
  
  if (!account) {
    console.error('No default account found');
    return null;
  }

  return getValidAccessToken(account.account_id);
}

/**
 * Example usage in your API:
 * 
 * const token = await getValidAccessToken(accountId);
 * if (!token) {
 *   // Handle error - user needs to re-authenticate
 *   return Response.json({ error: 'Authentication required' }, { status: 401 });
 * }
 * 
 * // Use token for API calls
 * const response = await fetch('https://docusign-api-url', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 */