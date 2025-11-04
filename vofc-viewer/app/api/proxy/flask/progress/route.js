import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Get Flask URL from environment variables
  const FLASK_URL = process.env.NEXT_PUBLIC_FLASK_URL || 
                   process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_SERVER_URL || 
                   process.env.OLLAMA_LOCAL_URL || 
                   (process.env.NODE_ENV === 'development' || !process.env.VERCEL ? 'http://localhost:5000' : 'https://flask.frostech.site')
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const res = await fetch(`${FLASK_URL}/api/progress`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    
    const data = await res.json()
    return NextResponse.json(data)
    
  } catch (err) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Request timeout',
          current_file: null,
          progress_percent: 0
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        status: 'idle',
        message: err.message || 'Failed to fetch progress',
        current_file: null,
        progress_percent: 0
      },
      { status: 500 }
    )
  }
}

