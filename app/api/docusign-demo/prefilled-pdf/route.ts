import { NextRequest } from 'next/server';
import { getDocusignToken } from '@/lib/api-services/docusign/auth';
import { getDocusignBaseUrl } from '@/lib/api-services/docusign/base';
import { createDocusignEnvelope, Tabs } from '@/lib/api-services/docusign/envelope';
import { getQuikToken } from '@/lib/api-services/quik/auth';
import { fetchBulkQuickPdfSignLocations, BulkQuikSignLocationResponse } from '@/lib/api-services/quik/sign';

// ---- Types ----

interface Signer {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface RequestPayload {
  formId: string;
  pdfBase64: string;
  signers: Signer[];
  emailSubject?: string;
  status?: 'created' | 'sent';
}

// ---- Helper Functions ----

const round = (n: number) => Math.round(n);

function createTabsFromSignLocation(
  filteredSignLocation: {
    SignFields: any[];
    SignDateFields: any[];
    SignInitialsFields: any[];
  },
  documentId: string
): Tabs {
  return {
    signHereTabs: filteredSignLocation.SignFields.map((sf) => ({
      documentId,
      xPosition: round(sf.DocusignXCoord),
      yPosition: round(sf.DocusignYCoord),
      pageNumber: sf.Page.toString(),
    })),
    initialHereTabs: filteredSignLocation.SignInitialsFields.map((sif) => ({
      documentId,
      xPosition: round(sif.DocusignXCoord),
      yPosition: round(sif.DocusignYCoord),
      pageNumber: sif.Page.toString(),
    })),
    dateSignedTabs: filteredSignLocation.SignDateFields.map((sdf) => ({
      documentId,
      xPosition: round(sdf.DocusignXCoord),
      yPosition: round(sdf.DocusignYCoord),
      pageNumber: sdf.Page.toString(),
    })),
    attachmentTabs: [],
  };
}

function mapSignersToTabs(
  signers: Signer[],
  signLocation: BulkQuikSignLocationResponse,
  documentId: string
) {
  return signers.map((signer, index) => {
    const filteredSignLocation = {
      SignFields:
        signLocation?.SignFields?.filter(
          (sf) => sf.FieldRole === signer.role
        ) || [],
      SignDateFields:
        signLocation?.SignDateFields?.filter(
          (sdf) => sdf.FieldRole === signer.role
        ) || [],
      SignInitialsFields:
        signLocation?.SignInitialsFields?.filter(
          (sif) => sif.FieldRole === signer.role
        ) || [],
    };

    const tabs = createTabsFromSignLocation(filteredSignLocation, documentId);

    return {
      email: signer.email,
      name: `${signer.firstName} ${signer.lastName}`,
      recipientId: (index + 1).toString(),
      tabs,
    };
  });
}

// ---- API Route Handler ----

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestPayload;
    const {
      formId,
      pdfBase64,
      signers,
      emailSubject = 'Please sign this document',
      status = 'sent',
    } = body;

    // Validate required fields
    if (!formId) {
      return new Response('Missing required field: formId', { status: 400 });
    }

    if (!pdfBase64) {
      return new Response('Missing required field: pdfBase64', { status: 400 });
    }

    if (!signers || signers.length === 0) {
      return new Response('Missing required field: signers (must be a non-empty array)', { status: 400 });
    }

    // Validate each signer has required fields
    for (const signer of signers) {
      if (!signer.email || !signer.firstName || !signer.lastName || !signer.role) {
        return new Response(
          'Each signer must have: email, firstName, lastName, and role',
          { status: 400 }
        );
      }
    }

    // Fetch sign locations from Quik API
    const quikToken = await getQuikToken();
    const signLocations = await fetchBulkQuickPdfSignLocations(quikToken, [formId]);

    if (!signLocations || signLocations.length === 0) {
      return new Response(`No sign locations found for formId: ${formId}`, {
        status: 404,
      });
    }

    const signLocation = signLocations[0];

    // Map signers to DocuSign recipients with tabs
    const documentId = '1';
    const docusignSigners = mapSignersToTabs(signers, signLocation, documentId);

    // Prepare document for DocuSign
    const documents = [
      {
        documentBase64: pdfBase64,
        documentId,
        documentName: `Form ${formId}.pdf`,
      },
    ];

    // Get DocuSign credentials
    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    // Create envelope in DocuSign
    const envelope = await createDocusignEnvelope({
      token: docusignToken,
      documents,
      docusignBaseUrl: apiBaseUrl,
      accountId,
      emailSubject,
      signers: docusignSigners,
      status,
    });

    return Response.json(envelope);
  } catch (err) {
    console.error('Error in prefilled-pdf endpoint:', err);
    return new Response(
      err instanceof Error ? err.message : 'Internal Server Error',
      { status: 500 }
    );
  }
}
