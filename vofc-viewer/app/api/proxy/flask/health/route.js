import { NextResponse } from 'next/server';

/**
 * Proxy route to Flask health endpoint
 * This allows Vercel to communicate with Flask through the Cloudflare tunnel
 */
export async function GET(request) {
  try {
    // Get Flask URL from environment or default
    const flaskUrl = process.env.OLLAMA_SERVER_URL || 
                     process.env.OLLAMA_LOCAL_URL || 
                     (process.env.VERCEL === '1' 
                       ? 'https://flask.frostech.site' 
                       : 'http://127.0.0.1:5000');
    
    const response = await fetch(`${flaskUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Flask health check failed: HTTP ${response.status}`,
          status: 'error',
          url: flaskUrl
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data,
      url: flaskUrl
    });
    
  } catch (error) {
    console.error('Flask proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to connect to Flask server',
        status: 'offline'
      },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';

