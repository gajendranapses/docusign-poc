import { NextRequest } from 'next/server';
import { getFormById } from '@/lib/config/form-registry';
import { fillPdfForm, fillStaticPdfForm } from '@/lib/utils/pdf-form-handler';

interface FillFormRequest {
  formId: string;
  [key: string]: string | boolean | undefined;
}

/**
 * POST /api/forms/fill
 *
 * Unified endpoint to fill any form with provided field values and return the filled PDF as base64
 *
 * @header x-api-key - API key for authentication (required)
 * @body formId - The ID of the form (e.g., 'ey-checking-account-application')
 * @body ...fields - Any additional fields as key-value pairs
 *
 * Example request body:
 * {
 *   "formId": "ey-checking-account-application",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "accountType": "Individual"
 * }
 *
 * @returns Object with formId, formName, and pdfBase64 (the filled PDF in base64 format)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.API_SECRET_KEY;

    if (!expectedApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Server Configuration Error',
          message: 'API key not configured on server',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = (await request.json()) as FillFormRequest;

    if (!body.formId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Request body must contain a "formId" field',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get form configuration
    const formConfig = getFormById(body.formId);

    if (!formConfig) {
      return new Response(
        JSON.stringify({
          error: 'Form not found',
          message: `No form found with ID: ${body.formId}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract field data (everything except formId)
    const { formId, ...rawFieldData } = body;

    // Filter out undefined values
    const fieldData = Object.entries(rawFieldData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string | boolean>);

    // Fill the form based on whether it's interactive or static
    let pdfBase64;
    if (formConfig.isInteractive) {
      pdfBase64 = await fillPdfForm(formConfig.path, fieldData, formConfig.fieldMapping);
    } else {
      if (!formConfig.fields) {
        return new Response(
          JSON.stringify({
            error: 'Configuration Error',
            message: 'Static form is missing field definitions',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      pdfBase64 = await fillStaticPdfForm(formConfig.path, fieldData, formConfig.fields);
    }

    return Response.json({
      formId: formConfig.id,
      formName: formConfig.name,
      pdfBase64,
    });
  } catch (error) {
    console.error('Error filling form:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
