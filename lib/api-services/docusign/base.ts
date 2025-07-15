export const getDocusignBaseUrl = async (token: string) => {
  const aud = process.env.DOCUSIGN_HOST_ENV || 'account-d.docusign.com';

  const response = await fetch(`https://${aud}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user info: ${response.status} ${error}`);
  }

  const data = await response.json();

  const defaultAccount = data.accounts.find(
    (acc: { is_default: boolean; base_uri: string; account_id: string }) =>
      acc.is_default,
  );

  if (!defaultAccount) {
    throw new Error('No default DocuSign account found for the user.');
  }

  const baseUri = defaultAccount.base_uri;
  const accountId = defaultAccount.account_id as string;

  // Ensure final API base includes /restapi/v2.1
  const apiBaseUrl = `${baseUri}/restapi/v2.1`;

  return {
    apiBaseUrl,
    accountId,
  };
};
