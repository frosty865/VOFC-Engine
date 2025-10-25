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

    // Get all users
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || [],
      count: users?.length || 0
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
