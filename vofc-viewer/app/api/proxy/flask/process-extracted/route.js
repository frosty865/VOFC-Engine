import { NextResponse } from 'next/server'
import { safeFetch, getFlaskUrl, createSafeErrorResponse, createSafeSuccessResponse } from '@/app/lib/server-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const FLASK_URL = getFlaskUrl()
  
  try {
    const result = await safeFetch(`${FLASK_URL}/api/files/process-extracted`, {
      method: 'POST',
      timeout: 3600000, // 1 hour timeout for long processing
    })
    
    if (!result.success) {
      return NextResponse.json(
        createSafeErrorResponse(
          result.error || 'Flask server unavailable',
          'error',
          { flask_url: FLASK_URL }
        ),
        { status: 200 } // Return 200 so frontend can handle gracefully
      )
    }
    
    return NextResponse.json(
      createSafeSuccessResponse(result.data, 'Processing completed'),
      { status: 200 }
    )
    
  } catch (err) {
    console.error('Process extracted error:', err.message)
    
    return NextResponse.json(
      createSafeErrorResponse(
        err.message || 'Failed to process extracted text files',
        'error',
        { flask_url: FLASK_URL }
      ),
      { status: 200 } // Return 200 so frontend can handle gracefully
    )
  }
}

