import { getAllForms } from '@/lib/config/form-registry';

/**
 * GET /api/forms
 *
 * Returns a list of all available forms
 *
 * @returns Array of form configurations (id, name)
 */
export async function GET() {
  try {
    const forms = getAllForms();

    return Response.json({
      forms: forms.map((form) => ({
        id: form.id,
        name: form.name,
      })),
    });
  } catch (error) {
    console.error('Error listing forms:', error);
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
