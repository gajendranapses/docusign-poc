import jwt from 'jsonwebtoken';

export const getDocusignToken = async () => {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientId = process.env.DOCUSIGN_INTEGRATION_KEY!;
  const userId = process.env.DOCUSIGN_USER_ID!;
  const aud = process.env.DOCUSIGN_HOST_ENV! || 'account-d.docusign.com';

  const jwtPayload = {
    iss: clientId,
    sub: userId,
    aud,
    scope: 'signature impersonation',
  };

  const jwtToken = jwt.sign(jwtPayload, privateKey!, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });

  const response = await fetch(`https://${aud}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    }),
  });

  const token = await response.json();

  return token.access_token as string;
};
