import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Fetch all OFC requests
    const { data: ofcRequests, error } = await supabase
      .from('ofc_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching OFC requests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch OFC requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ofcRequests: ofcRequests || []
    });

  } catch (error) {
    console.error('Error in OFC requests API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
