import { NextResponse } from 'next/server'
import { safeFetch, getFlaskUrl, createSafeErrorResponse, createSafeSuccessResponse } from '@/app/lib/server-utils'

export const dynamic = 'force-dynamic'

export async function POST() {
  const flaskUrl = getFlaskUrl()
  
  console.log(`[Flask Proxy] Calling Flask process-pending at: ${flaskUrl}/process-pending`)
  
  try {
    const result = await safeFetch(`${flaskUrl}/process-pending`, {
      method: 'POST',
      timeout: 60000, // 60 second timeout
    })
    
    if (!result.success) {
      return NextResponse.json(
        createSafeErrorResponse(
          result.error || 'Flask server unavailable',
          'error',
          { flask_url: flaskUrl, processed: 0 }
        ),
        { status: 200 } // Return 200 so frontend can handle gracefully
      )
    }
    
    const data = result.data
    console.log('[Flask Proxy] Flask process-pending response:', data)
    
    return NextResponse.json(
      createSafeSuccessResponse(
        {
          message: data.status === 'ok' ? 'Processing completed' : data.status,
          processed: data.processed?.length || 0,
          status: data.status,
          flask_response: data,
        },
        'Processing request sent'
      ),
      { status: 200 }
    )
    
  } catch (error) {
    console.error('[Flask Proxy] Error in process-pending proxy:', error)
    return NextResponse.json(
      createSafeErrorResponse(
        error.message || 'Failed to process pending files',
        'error',
        { flask_url: flaskUrl, processed: 0 }
      ),
      { status: 200 } // Return 200 so frontend can handle gracefully
    )
  }
}

