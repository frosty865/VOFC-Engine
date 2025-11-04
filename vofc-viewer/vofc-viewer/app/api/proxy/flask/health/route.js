import { NextResponse } from 'next/server';
import { safeFetch, getFlaskUrl, createSafeErrorResponse, createSafeSuccessResponse } from '@/app/lib/server-utils';

/**
 * Proxy route to Flask health endpoint
 * This allows Vercel to communicate with Flask through the Cloudflare tunnel
 */
export async function GET(request) {
  const flaskUrl = getFlaskUrl();
  
  try {
    const result = await safeFetch(`${flaskUrl}/health`, {
      timeout: 10000,
    });
    
    if (!result.success) {
      return NextResponse.json(
        createSafeErrorResponse(
          result.error || 'Flask server unavailable',
          'offline',
          { url: flaskUrl }
        ),
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }
    
    return NextResponse.json(
      createSafeSuccessResponse(
        {
          data: result.data,
          url: flaskUrl,
        },
        'Flask server is online'
      ),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Flask proxy error:', error);
    return NextResponse.json(
      createSafeErrorResponse(
        error.message || 'Failed to connect to Flask server',
        'offline',
        { url: flaskUrl }
      ),
      { status: 200 } // Return 200 so frontend can handle gracefully
    );
  }
}

export const dynamic = 'force-dynamic';

