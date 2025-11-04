import { NextResponse } from 'next/server'
import { safeFetch, getFlaskUrl, createSafeErrorResponse } from '@/app/lib/server-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const FLASK_URL = getFlaskUrl()
  
  try {
    const result = await safeFetch(`${FLASK_URL}/api/progress`, {
      timeout: 5000,
    })
    
    if (!result.success) {
      // Return safe default response
      return NextResponse.json(
        createSafeErrorResponse(
          result.error || 'Flask server unavailable',
          'idle',
          {
            current_file: null,
            progress_percent: 0,
          }
        ),
        { status: 200 } // Return 200 so frontend can handle gracefully
      )
    }
    
    const data = result.data
    // Ensure response has required fields
    if (!data.status) {
      data.status = 'idle'
    }
    if (typeof data.progress_percent !== 'number') {
      data.progress_percent = 0
    }
    
    return NextResponse.json(data, { status: 200 })
    
  } catch (err) {
    console.error('Progress API error:', err.message)
    
    return NextResponse.json(
      createSafeErrorResponse(
        err.message || 'Failed to fetch progress',
        'idle',
        {
          current_file: null,
          progress_percent: 0,
        }
      ),
      { status: 200 } // Return 200 so frontend can handle gracefully
    )
  }
}

