import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase.js';

export async function GET(request) {
  try {
    console.log('🔍 Auth verify endpoint called');
    
    // Get the access token from cookies
    const cookieHeader = request.headers.get('cookie');
    console.log('🍪 Cookie header:', cookieHeader ? 'Present' : 'Missing');
    
    if (!cookieHeader) {
      console.log('❌ No cookies found');
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    // Extract the access token from cookies
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const accessToken = cookies['sb-access-token'];
    console.log('🔑 Access token:', accessToken ? 'Present' : 'Missing');

    if (!accessToken) {
      console.log('❌ No access token found in cookies');
      return NextResponse.json(
        { success: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    // Create service role client to verify the token
    const serviceSupabase = supabaseAdmin;

    // Verify the access token
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.log('❌ Token verification failed:', authError?.message);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await serviceSupabase
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
        full_name: `${profile.first_name} ${profile.last_name}`,
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