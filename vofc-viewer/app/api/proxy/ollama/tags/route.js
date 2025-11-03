import { NextResponse } from 'next/server';

/**
 * Proxy route to Ollama API /api/tags endpoint
 * This allows Vercel to communicate with Ollama through the Cloudflare tunnel
 */
export async function GET(request) {
  try {
    // Get Ollama URL from environment or default
    const ollamaUrl = process.env.OLLAMA_URL || 
                      (process.env.VERCEL === '1' 
                        ? 'https://ollama.frostech.site' 
                        : 'http://localhost:11434');
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Ollama API check failed: HTTP ${response.status}`,
          status: 'error',
          url: ollamaUrl
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data,
      url: ollamaUrl
    });
    
  } catch (error) {
    console.error('Ollama proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to connect to Ollama API',
        status: 'offline'
      },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';

