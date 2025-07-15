/**
 * Health check endpoint for the application
 * Used by Docker and other monitoring systems to verify the application is running
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'avantos-embeddable-ui',
  });
}
