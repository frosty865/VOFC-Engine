import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Get Flask server URL from environment or use default
    const defaultFlaskUrl = 'http://localhost:5000'
    const flaskUrl = process.env.OLLAMA_SERVER_URL || 
                     process.env.OLLAMA_LOCAL_URL || 
                     process.env.FLASK_URL ||
                     defaultFlaskUrl
    
    console.log(`[Flask Proxy] Calling Flask process-pending at: ${flaskUrl}/process-pending`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const response = await fetch(`${flaskUrl}/process-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Flask Proxy] Flask returned error: ${response.status} - ${errorText}`)
        return NextResponse.json(
          { 
            success: false, 
            error: `Flask server returned ${response.status}: ${errorText}`,
            flask_url: flaskUrl
          },
          { status: response.status }
        )
      }
      
      const data = await response.json()
      console.log('[Flask Proxy] Flask process-pending response:', data)
      
      return NextResponse.json({
        success: true,
        message: data.status === 'ok' ? 'Processing completed' : data.status,
        processed: data.processed?.length || 0,
        status: data.status,
        flask_response: data
      })
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[Flask Proxy] Request timed out after 60 seconds')
        return NextResponse.json(
          { 
            success: false, 
            error: 'Request to Flask server timed out',
            flask_url: flaskUrl
          },
          { status: 504 }
        )
      }
      
      console.error('[Flask Proxy] Network error calling Flask:', fetchError.message)
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot reach Flask server: ${fetchError.message}`,
          flask_url: flaskUrl,
          hint: 'Make sure the Flask server is running and accessible'
        },
        { status: 503 }
      )
    }
    
  } catch (error) {
    console.error('[Flask Proxy] Error in process-pending proxy:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

