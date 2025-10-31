// Auth middleware functions for API routes
import { AuthService } from './auth-server.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client directly if not available from import
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Auth Middleware] Missing Supabase env vars');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function requireAuth(request) {
  return await AuthService.requireAuth(request);
}

export async function requireAdmin(request) {
  // Prefer Supabase bearer token auth
  try {
    const authHeader = request.headers.get('authorization') || '';
    const hasBearer = authHeader.toLowerCase().startsWith('bearer ');
    
    if (hasBearer) {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        console.error('[Auth Middleware] Cannot create Supabase admin client');
        return { user: null, error: 'Server configuration error' };
      }

      const accessToken = authHeader.slice(7).trim();
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
      
      if (userError) {
        console.error('[Auth Middleware] Token validation error:', userError.message);
        return { user: null, error: `Authentication failed: ${userError.message}` };
      }
      
      if (!user) {
        console.error('[Auth Middleware] No user returned from token');
        return { user: null, error: 'Invalid authentication token' };
      }

      // Get profile with role
      let { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role, user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!profile && !profileError) {
        // Try fallback query by id
        const resp = await supabaseAdmin
          .from('user_profiles')
          .select('role, user_id')
          .eq('id', user.id)
          .maybeSingle();
        profile = resp.data || null;
      }

      // Derive role
      let role = String(profile?.role || user.user_metadata?.role || 'user').toLowerCase();
      
      // Check email allowlist if role is still 'user'
      if (role === 'user') {
        const allowlist = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
        if (allowlist.includes(String(user.email).toLowerCase())) {
          role = 'admin';
        }
      }

      console.log('[Auth Middleware] User check:', { 
        email: user.email, 
        role, 
        profileRole: profile?.role,
        isAdmin: ['admin','spsa'].includes(role)
      });

      // Check if admin/spsa
      if (['admin','spsa'].includes(role)) {
        return { user: { id: user.id, email: user.email, role }, error: null };
      }
      
      return { user: null, error: 'Admin access required' };
    }
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error:', error);
    return { user: null, error: `Authentication error: ${error.message}` };
  }
  
  // Fallback to legacy JWT if present
  return await AuthService.requireAdmin(request);
}

export async function requireRole(request, allowedRoles) {
  const { user, error } = await AuthService.requireAuth(request);
  if (error) {
    return { user: null, error };
  }

  if (!allowedRoles.includes(user.role)) {
    return { user: null, error: 'Insufficient permissions' };
  }

  return { user, error: null };
}
