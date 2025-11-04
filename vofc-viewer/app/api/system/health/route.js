import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Get Flask URL from environment variables
  // Priority: explicit env var > localhost (for dev) > remote URL (for prod)
  const FLASK_URL = process.env.NEXT_PUBLIC_FLASK_URL || 
                   process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_LOCAL_URL || 
                   (process.env.NODE_ENV === 'development' || !process.env.VERCEL ? 'http://localhost:5000' : 'https://flask.frostech.site')
  
  console.log('[System Health API Proxy] Using Flask URL:', FLASK_URL)
  
  try {
    // Proxy request to Flask /api/system/health endpoint
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const healthUrl = `${FLASK_URL}/api/system/health`
    console.log('[System Health API Proxy] Fetching from:', healthUrl)
    
    const res = await fetch(healthUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error details')
      console.error('[System Health API Proxy] Flask returned error:', res.status, errorText)
      throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 100)}`)
    }
    
    const data = await res.json()
    console.log('[System Health API Proxy] Flask response received:', JSON.stringify(data).substring(0, 200))
    
    // Return the health data directly from Flask
    return NextResponse.json(data)
    
  } catch (err) {
    console.error('[System Health API Proxy] Error:', err.message)
    console.error('[System Health API Proxy] Error type:', err.name)
    
    // Handle timeout
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Request timeout', 
          components: { 
            flask: 'offline (timeout)', 
            ollama: 'unknown', 
            supabase: 'unknown' 
          } 
        },
        { status: 500 }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      { 
        status: 'error', 
        message: err.message || 'Failed to connect to Flask server', 
        components: { 
          flask: 'offline', 
          ollama: 'unknown', 
          supabase: 'unknown' 
        },
        flaskUrl: FLASK_URL // Include for debugging
      },
      { status: 500 }
    )
  }
}
