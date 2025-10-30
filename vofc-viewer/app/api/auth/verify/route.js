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
    // Prefer join by user_id (your schema) and fall back to id
    let { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_admin, first_name, last_name, organization, user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile) {
      const resp = await supabaseAdmin
        .from('user_profiles')
        .select('role, is_admin, first_name, last_name, organization, user_id')
        .eq('id', user.id)
        .maybeSingle();
      profile = resp.data || null;
    }

    // Derive role with robust fallbacks
    let derivedRole = String(
      profile?.role || (profile?.is_admin ? 'admin' : '') || user.user_metadata?.role || 'user'
    ).toLowerCase();
    let isUserAdmin = Boolean(profile?.is_admin);
    
    // Final fallback: allow admin via configured email allowlist (comma-separated) or user.user_metadata.is_admin
    if (derivedRole === 'user') {
      const allowlist = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
      if (allowlist.includes(String(user.email).toLowerCase())) {
        derivedRole = 'admin';
        isUserAdmin = true;
      }
    }
    
    // Also check if role itself indicates admin
    if (['admin', 'spsa'].includes(derivedRole)) {
      isUserAdmin = true;
    }
    
    // Check user_metadata for is_admin flag
    if (user.user_metadata?.is_admin) {
      isUserAdmin = true;
      if (derivedRole === 'user') {
        derivedRole = 'admin';
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: derivedRole,
        name: (profile?.first_name || '') + (profile?.last_name ? ' ' + profile?.last_name : '') || user.user_metadata?.name || user.email,
        is_admin: isUserAdmin
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
