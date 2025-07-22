import { getValidAccessToken } from './token-manager';

/**
 * Example: Modified auth function that can use user tokens
 * This shows how you could modify your existing auth.ts in the future
 */

// Your current function (unchanged):
// export async function getDocusignToken(): Promise<string> { ... }

// New function for user-specific tokens:
export async function getUserDocusignToken(accountId?: string): Promise<string> {
  if (!accountId) {
    // Fallback to your current JWT auth
    const { getDocusignToken } = await import('./auth');
    return getDocusignToken();
  }

  const token = await getValidAccessToken(accountId);
  
  if (!token) {
    throw new Error('Failed to get valid access token. User needs to re-authenticate.');
  }

  return token;
}

/**
 * Example usage in your envelope creation API:
 * 
 * // Add accountId to your request body
 * const { emailSubject, forms, status, accountId } = body;
 * 
 * // Get token (user-specific or default)
 * const docusignToken = await getUserDocusignToken(accountId);
 * 
 * // Continue with envelope creation...
 */