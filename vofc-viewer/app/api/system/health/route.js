import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    // Get Flask URL from environment variables with fallback
    const flaskUrl = process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 
                   process.env.NEXT_PUBLIC_OLLAMA_LOCAL_URL || 
                   'https://flask.frostech.site'
    
    // Fetch health status from Flask backend
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const res = await fetch(`${flaskUrl}/api/system/health`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        // If Flask returns an error, return partial status
        return NextResponse.json({
          status: 'partial',
          components: {
            flask: `error (${res.status})`,
            ollama: 'unknown',
            supabase: 'unknown'
          },
          error: `Flask server returned ${res.status}`,
          message: 'Health check endpoint responded with an error'
        }, { status: 200 }) // Return 200 to allow frontend to handle gracefully
      }
      
      const data = await res.json()
      
      // Return the health data
      return NextResponse.json({
        status: data.status || 'ok',
        components: data.components || {},
        timestamp: new Date().toISOString()
      })
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Handle network errors, timeouts, etc.
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          status: 'timeout',
          components: {
            flask: 'offline (timeout)',
            ollama: 'unknown',
            supabase: 'unknown'
          },
          error: 'Health check request timed out',
          message: 'Flask server did not respond within 5 seconds'
        }, { status: 200 })
      }
      
      // Other fetch errors (network issues, DNS, etc.)
      return NextResponse.json({
        status: 'error',
        components: {
          flask: 'offline',
          ollama: 'unknown',
          supabase: 'unknown'
        },
        error: fetchError.message || 'Failed to connect to Flask server',
        message: 'Unable to reach Flask backend for health check',
        flaskUrl: flaskUrl // Include URL for debugging
      }, { status: 200 })
    }
    
  } catch (error) {
    console.error('[System Health API] Unexpected error:', error)
    return NextResponse.json({
      status: 'error',
      components: {
        flask: 'offline',
        ollama: 'unknown',
        supabase: 'unknown'
      },
      error: error.message || 'Unknown error occurred',
      message: 'Health check failed due to server error'
    }, { status: 500 })
  }
}

