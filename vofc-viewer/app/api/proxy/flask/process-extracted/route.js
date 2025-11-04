import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  // Get Flask URL from environment variables
  const FLASK_URL = process.env.NEXT_PUBLIC_FLASK_URL || 
                   process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_LOCAL_URL || 
                   (process.env.NODE_ENV === 'development' || !process.env.VERCEL ? 'http://localhost:5000' : 'https://flask.frostech.site')
  
  try {
    const controller = new AbortController()
    // Long timeout since processing can take a while
    const timeoutId = setTimeout(() => controller.abort(), 3600000) // 1 hour timeout
    
    const res = await fetch(`${FLASK_URL}/api/files/process-extracted`, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error details')
      throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 200)}`)
    }
    
    const data = await res.json()
    return NextResponse.json(data)
    
  } catch (err) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Request timeout - processing may still be running',
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: err.message || 'Failed to process extracted text files',
      },
      { status: 500 }
    )
  }
}

