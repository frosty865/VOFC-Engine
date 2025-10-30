// Updated to use Supabase authentication instead of JWT
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key to bypass RLS when checking user profile
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request) {
  try {
    // Get all cookies to find Supabase session
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Find Supabase auth token cookie
    let accessToken = null;
    // Prefer Authorization header if provided
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        accessToken = authHeader.slice(7).trim();
      }
    } catch {}
    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
        try {
          const tokenData = JSON.parse(cookie.value);
          accessToken = tokenData.access_token || tokenData;
          break;
        } catch {
          accessToken = cookie.value;
          break;
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token' },
        { status: 401 }
      );
    }

    // Verify token and get user using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user profile (role/group/is_admin)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, group, is_admin, full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    // Derive role with robust fallbacks
    const derivedRole = String(
      profile?.role ||
      profile?.group ||
      (profile?.is_admin ? 'admin' : '') ||
      user.user_metadata?.role ||
      'user'
    ).toLowerCase();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: derivedRole,
        name: profile?.full_name || user.user_metadata?.name || user.email,
        is_admin: Boolean(profile?.is_admin)
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 401 }
    );
  }
}
