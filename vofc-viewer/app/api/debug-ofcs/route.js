import { NextResponse } from 'next/server';
import { getServerClient } from '../../lib/supabase-manager';

export async function GET(request) {
  try {
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get all OFCs without authentication (for debugging)
    const { data: ofcs, error } = await supabaseServer
      .from('options_for_consideration')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ofcs: ofcs || [],
      count: ofcs?.length || 0,
      debug: {
        tableExists: true,
        queryExecuted: true
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
