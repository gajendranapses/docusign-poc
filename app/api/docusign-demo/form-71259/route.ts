import { NextRequest } from 'next/server';
import { getDocusignToken } from '@/lib/api-services/docusign/auth';
import { getDocusignBaseUrl } from '@/lib/api-services/docusign/base';
import { createDocusignEnvelope } from '@/lib/api-services/docusign/envelope';
import { getQuikToken } from '@/lib/api-services/quik/auth';
import { generateBulkQuikPdf } from '@/lib/api-services/quik/pdf';

const STATIC_FORM_ID = '71259';

// ---- Types ----

interface Field {
  DocusignXCoord: number;
  DocusignYCoord: number;
  Page: number;
  FieldRole: string;
}

interface QuikFields {
  SignFields: Field[];
  SignDateFields: Field[];
  SignInitialsFields: Field[];
}

interface FormField {
  FieldName: string;
  FieldValue: string;
}

interface RecipientDetail {
  email: string;
  name: string;
  recipientId: string;
  documents: {
    documentId: string;
    roles: string[];
  }[];
  attachments?: {
    documentId: string;
    name: string;
    tabLabel: string;
    pageNumber: string;
    xPosition: string;
    yPosition: string;
    required: boolean;
  }[];
}

interface RequestPayload {
  emailSubject: string;
  formDataPerDocument: {
    documentId: string;
    formFields: FormField[];
  }[];
  recipientDetails: RecipientDetail[];
  additionalDocuments?: {
    documentId: string;
    documentBase64: string;
    fileName: string;
  }[];
  status?: 'created' | 'sent';
}

// ---- Helpers ----

function transformToTabs(
  fields: QuikFields,
  documentId: string,
  roles: string[],
) {
  const round = (n: number) => Math.round(n);

  const filterFieldsByRole = <T extends Field>(items: T[]) =>
    items.filter((f) => roles.includes(f.FieldRole));

  const signHereTabs = filterFieldsByRole(fields.SignFields).map((field) => ({
    documentId,
    pageNumber: field.Page.toString(),
    xPosition: round(field.DocusignXCoord),
    yPosition: round(field.DocusignYCoord),
  }));

  const dateSignedTabs = filterFieldsByRole(fields.SignDateFields).map(
    (field) => ({
      documentId,
      pageNumber: field.Page.toString(),
      xPosition: round(field.DocusignXCoord),
      yPosition: round(field.DocusignYCoord),
    }),
  );

  const initialHereTabs = filterFieldsByRole(fields.SignInitialsFields).map(
    (field) => ({
      documentId,
      pageNumber: field.Page.toString(),
      xPosition: round(field.DocusignXCoord),
      yPosition: round(field.DocusignYCoord),
    }),
  );

  return {
    signHereTabs,
    dateSignedTabs,
    initialHereTabs,
  };
}

// ---- Static Sign Field Configuration ----

const staticSignFields: QuikFields = {
  SignFields: [
    {
      DocusignXCoord: 82.91,
      DocusignYCoord: 258.75,
      Page: 7,
      FieldRole: '1authind',
    },
    {
      DocusignXCoord: 64.56,
      DocusignYCoord: 452.42,
      Page: 6,
      FieldRole: '1own',
    },
    {
      DocusignXCoord: 329.12,
      DocusignYCoord: 452.42,
      Page: 6,
      FieldRole: '2own',
    },
    {
      DocusignXCoord: 62.66,
      DocusignYCoord: 530.27,
      Page: 6,
      FieldRole: '3own',
    },
    {
      DocusignXCoord: 329.75,
      DocusignYCoord: 530.27,
      Page: 6,
      FieldRole: '4own',
    },
  ],
  SignDateFields: [
    {
      DocusignXCoord: 221.53,
      DocusignYCoord: 486.08,
      Page: 6,
      FieldRole: '1own',
    },
    {
      DocusignXCoord: 389.25,
      DocusignYCoord: 292.41,
      Page: 7,
      FieldRole: '1authind',
    },
    {
      DocusignXCoord: 486.71,
      DocusignYCoord: 486.08,
      Page: 6,
      FieldRole: '2own',
    },
    {
      DocusignXCoord: 221.53,
      DocusignYCoord: 563.93,
      Page: 6,
      FieldRole: '3own',
    },
    {
      DocusignXCoord: 486.71,
      DocusignYCoord: 564.56,
      Page: 6,
      FieldRole: '4own',
    },
  ],
  SignInitialsFields: [],
};

// ---- API Route Handler ----

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestPayload;
    const {
      emailSubject,
      formDataPerDocument,
      recipientDetails,
      additionalDocuments = [],
      status,
    } = body;

    if (!formDataPerDocument.length || !recipientDetails.length) {
      return new Response('Missing form data or recipients', { status: 400 });
    }

    const quikToken = await getQuikToken();

    const forms = formDataPerDocument.map((form) => ({
      formId: STATIC_FORM_ID,
      documentId: form.documentId,
      formFields: form.formFields,
    }));

    const pdfs = await generateBulkQuikPdf({ token: quikToken, forms });

    const documents = pdfs
      .map((pdf) => ({
        documentBase64: pdf.pdf,
        documentId: pdf.documentId,
        documentName: pdf.fileName,
      }))
      .concat(
        additionalDocuments.map((doc) => ({
          documentId: doc.documentId,
          documentBase64: doc.documentBase64,
          documentName: doc.fileName, // remap here
        })),
      );

    const signers = recipientDetails.map((recipient) => {
      const tabsPerDocument = recipient.documents.map((doc) =>
        transformToTabs(staticSignFields, doc.documentId, doc.roles || []),
      );

      const combinedTabs = tabsPerDocument.reduce(
        (acc, curr) => ({
          signHereTabs: [
            ...(acc.signHereTabs || []),
            ...(curr.signHereTabs || []),
          ],
          dateSignedTabs: [
            ...(acc.dateSignedTabs || []),
            ...(curr.dateSignedTabs || []),
          ],
          initialHereTabs: [
            ...(acc.initialHereTabs || []),
            ...(curr.initialHereTabs || []),
          ],
        }),
        { signHereTabs: [], dateSignedTabs: [], initialHereTabs: [] },
      );

      return {
        email: recipient.email,
        name: recipient.name,
        recipientId: recipient.recipientId,
        tabs: {
          ...combinedTabs,
          attachmentTabs: recipient.attachments || [],
        },
      };
    });

    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    const envelope = await createDocusignEnvelope({
      token: docusignToken,
      documents,
      docusignBaseUrl: apiBaseUrl,
      accountId,
      emailSubject,
      signers,
      status,
    });

    return Response.json(envelope);
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
