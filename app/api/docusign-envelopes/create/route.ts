import { NextRequest } from 'next/server';
import { getDocusignToken } from '@/lib/api-services/docusign/auth';
import { getDocusignBaseUrl } from '@/lib/api-services/docusign/base';
import { createDocusignEnvelope } from '@/lib/api-services/docusign/envelope';
import { getQuikToken } from '@/lib/api-services/quik/auth';
import { generateBulkQuikPdf } from '@/lib/api-services/quik/pdf';
import { fetchQuickPdfSignLocations } from '@/lib/api-services/quik/sign';
interface Form {
  documentId: string;
  formFields: {
    FieldName: string;
    FieldValue: string;
  }[];
  formId: string;
}

interface RecipientDetail {
  email: string;
  name: string;
  recipientId: string;
  documentId: string;
  attachments: {
    documentId: string;
    name: string;
    tabLabel: string;
    pageNumber: string;
    xPosition: string;
    yPosition: string;
    required: boolean;
  }[];
}

function validate(forms: Form[], recipientDetails: RecipientDetail[]) {
  if (!forms.length || !recipientDetails.length) {
    return {
      isValid: false,
      error: 'Invalid request',
    };
  }

  const formDocumentIds = forms.map((form) => form.documentId);

  // Check for undefined or non-string document IDs
  const invalidDocIds = formDocumentIds.filter(
    (id) => !id || typeof id !== 'string',
  );
  if (invalidDocIds.length > 0) {
    return {
      isValid: false,
      error: 'Document IDs must be non-empty strings',
    };
  }

  // Check that all document IDs are numeric strings
  const nonNumericIds = formDocumentIds.filter((id) => !/^\d+$/.test(id));
  if (nonNumericIds.length > 0) {
    return {
      isValid: false,
      error: 'Document IDs must be numeric strings (e.g. "1", "2", etc.)',
    };
  }

  // Check for duplicate document IDs
  const uniqueDocIds = new Set(formDocumentIds);
  if (uniqueDocIds.size !== formDocumentIds.length) {
    return {
      isValid: false,
      error: 'Document IDs must be unique',
    };
  }

  const recipientDocumentIds = recipientDetails.map(
    (recipient) => recipient.documentId,
  );

  if (recipientDocumentIds.find((id) => !formDocumentIds.includes(id))) {
    return {
      isValid: false,
      error: 'documentId mismatch',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      emailSubject,
      forms,
      recipientDetails,
      status,
    }: {
      emailSubject: string;
      forms: Form[];
      recipientDetails: RecipientDetail[];
      status?: 'created' | 'sent';
    } = body;

    const { isValid, error } = validate(forms, recipientDetails);

    if (!isValid) {
      return new Response(error, { status: 400 });
    }

    const quikToken = await getQuikToken();

    const [quikSignLocations, quikPdf] = await Promise.all([
      fetchQuickPdfSignLocations(quikToken, forms),
      generateBulkQuikPdf({
        token: quikToken,
        forms,
      }),
    ]);

    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    const docusignEnvelope = await createDocusignEnvelope({
      token: docusignToken,
      documents: quikPdf.map((pdf) => ({
        documentBase64: pdf.pdf,
        documentId: pdf.documentId,
        documentName: pdf.fileName,
      })),
      docusignBaseUrl: apiBaseUrl,
      accountId,
      emailSubject,
      signers: recipientDetails.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
        recipientId: recipient.recipientId,
        tabs: {
          ...(quikSignLocations.find(
            (location) => location.documentId === recipient.documentId,
          )?.tabs || {
            signHereTabs: [],
            initialHereTabs: [],
            dateSignedTabs: [],
          }),
          attachmentTabs: recipient.attachments || [],
        },
      })),
      status,
    });

    return Response.json(docusignEnvelope);

    // const token = await getDocusignToken();
  } catch (error) {
    console.error(error);
    return new Response('Internal server error', { status: 500 });
  }
}
