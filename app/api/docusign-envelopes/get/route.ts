import { NextRequest } from 'next/server';
import { getDocusignToken } from '@/lib/api-services/docusign/auth';
import { getDocusignBaseUrl } from '@/lib/api-services/docusign/base';
import { getEnvelopeStatus } from '@/lib/api-services/docusign/envelope';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');
    if (!envelopeId) {
      return Response.json(
        { error: 'Envelope ID is required' },
        { status: 400 },
      );
    }
    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    const envelopeStatus = await getEnvelopeStatus({
      envelopeId,
      accessToken: docusignToken,
      accountId,
      baseUrl: apiBaseUrl,
    });

    return Response.json({ envelopeStatus });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
