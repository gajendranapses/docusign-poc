import { getDocusignToken } from "@/lib/api-services/docusign/auth";
import { getDocusignBaseUrl } from "@/lib/api-services/docusign/base";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const { envelopeId } = await params;
    
    // Get type parameter from query string (combined or individual documents)
    const url = new URL(request.url);
    const downloadType = url.searchParams.get('type') || 'combined';
    const documentId = url.searchParams.get('documentId');

    // Get DocuSign token and base URL
    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    let downloadUrl: string;
    let filename: string;

    if (downloadType === 'combined') {
      // Download all documents as a single PDF
      downloadUrl = `${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`;
      filename = `envelope-${envelopeId}-combined.pdf`;
    } else if (downloadType === 'archive') {
      // Download as a zip archive with all documents
      downloadUrl = `${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}/documents/archive`;
      filename = `envelope-${envelopeId}-archive.zip`;
    } else if (downloadType === 'individual' && documentId) {
      // Download a specific document
      downloadUrl = `${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}/documents/${documentId}`;
      filename = `document-${documentId}.pdf`;
    } else {
      return Response.json(
        { error: 'Invalid download type or missing documentId' },
        { status: 400 }
      );
    }

    // Fetch the document from DocuSign
    const documentResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${docusignToken}`,
        Accept: downloadType === 'archive' ? 'application/zip' : 'application/pdf',
      },
    });

    if (!documentResponse.ok) {
      throw new Error('Failed to download document from DocuSign');
    }

    // Get the content type from DocuSign response
    const contentType = documentResponse.headers.get('content-type') || 
      (downloadType === 'archive' ? 'application/zip' : 'application/pdf');
    
    // Get the document data
    const documentData = await documentResponse.arrayBuffer();

    // Return the document with appropriate headers
    return new Response(documentData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': documentData.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Error downloading envelope documents:", error);
    return Response.json(
      { error: "Failed to download envelope documents" },
      { status: 500 }
    );
  }
}