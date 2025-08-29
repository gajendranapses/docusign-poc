export type Tabs = {
  signHereTabs: {
    documentId: string;
    xPosition: number;
    yPosition: number;
    pageNumber: string;
  }[];
  initialHereTabs: {
    documentId: string;
    pageNumber: string;
    xPosition: number;
    yPosition: number;
  }[];
  dateSignedTabs: {
    documentId: string;
    pageNumber: string;
    xPosition: number;
    yPosition: number;
  }[];
  attachmentTabs: {
    documentId: string;
    name: string;
    tabLabel: string;
    pageNumber: string;
    xPosition: string;
    yPosition: string;
    required: boolean;
  }[];
};

export const createDocusignEnvelope = async ({
  token,
  documents,
  docusignBaseUrl,
  accountId,
  emailSubject,
  signers,
  status = 'sent',
  cc =[]
}: {
  token: string;
  documents: {
    documentBase64: string;
    documentId: string;
    documentName: string;
  }[];
  docusignBaseUrl: string;
  accountId: string;
  emailSubject: string;
  signers: {
    email: string;
    name: string;
    recipientId: string;
    tabs: Tabs;
  }[];
  status?: 'created' | 'sent';
  cc?: {
    name: string;
    email: string;
    recipientId: string;
    routingOrder: string;
    excludedDocuments: string[];
  }[];
}) => {
  const bodyData = {
    documents: documents.map((document) => ({
      documentBase64: document.documentBase64,
      documentId: document.documentId,
      fileExtension: 'pdf',
      name: document.documentName,
    })),
    emailSubject,
    recipients: {
      signers,
      carbonCopies: cc || []
    },
    enforceSignerVisibility: true,
    status,
  };

  const response = await fetch(
    `${docusignBaseUrl}/accounts/${accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyData),
    },
  );

  const data = await response.json();
  return data;
};

export const getEnvelopeStatus = async ({
  envelopeId,
  accessToken,
  accountId,
  baseUrl,
}: {
  envelopeId: string;
  accessToken: string;
  accountId: string;
  baseUrl: string;
}) => {
  if (!envelopeId || !accessToken || !accountId || !baseUrl) {
    throw new Error('Missing required parameters for getEnvelopeStatus');
  }

  const url = `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}?include=recipients,tabs`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to fetch envelope status: ${response.status} - ${error}`,
    );
  }

  const data = await response.json();
  return data; // contains envelope status, timestamps, recipients, etc.
};
