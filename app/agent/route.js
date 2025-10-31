// Quiet handler for unexpected /agent probes from extensions/monitors
export async function GET() {
  return new Response(null, { status: 204 })
}


