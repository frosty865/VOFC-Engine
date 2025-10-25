import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

export async function GET(request) {
  try {
    console.log('🔍 Auth verify endpoint called');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    console.log('📋 Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return NextResponse.json(
        { success: false, error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔑 Token received:', token.substring(0, 20) + '...');

    // Create service role client for token verification
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the JWT token
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token);

    if (authError || !user) {
      console.log('❌ Token verification failed:', authError?.message);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', user.email);

    // Get user profile using fresh service client (to avoid RLS recursion)
    const freshServiceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: profile, error: profileError } = await freshServiceSupabase
      .from('user_profiles')
      .select('role, first_name, last_name, organization, is_active, username')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('❌ Profile lookup failed:', profileError?.message);
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 401 }
      );
    }

    if (!profile.is_active) {
      console.log('❌ Account is inactive');
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 401 }
      );
    }

    console.log('✅ Profile found:', profile.role);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        name: `${profile.first_name} ${profile.last_name}`,
        organization: profile.organization,
        username: profile.username
      }
    });

  } catch (error) {
    console.error('❌ Auth verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}