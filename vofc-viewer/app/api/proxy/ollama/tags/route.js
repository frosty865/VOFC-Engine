import { NextResponse } from 'next/server';
import { safeFetch, getOllamaUrl, checkOllamaHealth, createSafeErrorResponse, createSafeSuccessResponse } from '@/app/lib/server-utils';

/**
 * Proxy route to Ollama API /api/tags endpoint
 * This allows Vercel to communicate with Ollama through the Cloudflare tunnel
 */
export async function GET(request) {
  try {
    const healthData = await checkOllamaHealth();
    
    if (healthData.status === 'offline') {
      return NextResponse.json(
        createSafeErrorResponse(
          healthData.message || 'Ollama server unavailable',
          'offline',
          { url: healthData.url, models: [] }
        ),
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }
    
    return NextResponse.json(
      createSafeSuccessResponse(
        {
          data: { models: healthData.models },
          url: healthData.url,
        },
        'Ollama server is online'
      ),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Ollama proxy error:', error);
    const ollamaUrl = getOllamaUrl();
    return NextResponse.json(
      createSafeErrorResponse(
        error.message || 'Failed to connect to Ollama API',
        'offline',
        { url: ollamaUrl, models: [] }
      ),
      { status: 200 } // Return 200 so frontend can handle gracefully
    );
  }
}

export const dynamic = 'force-dynamic';

