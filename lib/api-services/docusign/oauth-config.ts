// DocuSign OAuth configuration
export const DOCUSIGN_OAUTH_CONFIG = {
  // OAuth endpoints - using the host from env
  authorizationUrl: `https://${process.env.DOCUSIGN_HOST_ENV}/oauth/auth`,
  tokenUrl: `https://${process.env.DOCUSIGN_HOST_ENV}/oauth/token`,
  userInfoUrl: `https://${process.env.DOCUSIGN_HOST_ENV}/oauth/userinfo`,
  
  // OAuth client credentials - using your env variable names
  clientId: process.env.DOCUSIGN_INTEGRATION_KEY || '',
  clientSecret: process.env.DOCUSIGN_INTEGRATION_SECRET || '',
  
  // OAuth settings
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI || `${process.env.NEXT_APP_BASE_URL || 'http://localhost:3000'}/api/docusign/callback`,
  scopes: ['signature', 'extended'], // Add more scopes as needed
  
  // State parameter for CSRF protection
  generateState: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

// Helper to build authorization URL
export const buildAuthorizationUrl = (state: string): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DOCUSIGN_OAUTH_CONFIG.clientId,
    redirect_uri: DOCUSIGN_OAUTH_CONFIG.redirectUri,
    scope: DOCUSIGN_OAUTH_CONFIG.scopes.join(' '),
    state: state
  });
  
  return `${DOCUSIGN_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
};