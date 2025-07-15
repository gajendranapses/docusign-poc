export const getQuikToken = async () => {
  const baseUrl = process.env.QUIK_BASE_URL;
  const masterPassword = process.env.QUIK_OAUTH_MASTER_PASSWORD;
  const username = process.env.QUIK_OAUTH_MASTER_USER;
  if (!baseUrl || !masterPassword || !username) {
    throw new Error('Missing required environment variables');
  }

  const response = await fetch(`${baseUrl}/rest_authentication/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username,
      password: masterPassword,
    }),
  });

  const data = await response.json();
  return data.access_token;
};
