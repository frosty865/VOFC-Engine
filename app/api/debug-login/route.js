import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    // Test 1: Check if we can access user_profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .limit(1);

    // Test 2: Check auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    return NextResponse.json({
      success: true,
      debug: {
        profileError: profileError?.message || null,
        profilesCount: profiles?.length || 0,
        authError: authError?.message || null,
        authUsersCount: authUsers?.users?.length || 0,
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
