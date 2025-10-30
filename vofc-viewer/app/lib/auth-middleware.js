// Auth middleware functions for API routes
import { AuthService } from './auth-server.js';
import { supabaseAdmin } from '../../lib/supabase-client.js';

export async function requireAuth(request) {
  return await AuthService.requireAuth(request);
}

export async function requireAdmin(request) {
  // Prefer Supabase bearer token auth
  try {
    const authHeader = request.headers.get('authorization') || '';
    const hasBearer = authHeader.toLowerCase().startsWith('bearer ');
    if (hasBearer && supabaseAdmin) {
      const accessToken = authHeader.slice(7).trim();
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      if (!error && user) {
        let { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('role, is_admin, user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!profile) {
          const resp = await supabaseAdmin
            .from('user_profiles')
            .select('role, is_admin, user_id')
            .eq('id', user.id)
            .maybeSingle();
          profile = resp.data || null;
        }
        const role = String(profile?.role || (profile?.is_admin ? 'admin' : '') || user.user_metadata?.role || 'user').toLowerCase();
        if (['admin','spsa'].includes(role)) {
          return { user: { id: user.id, email: user.email, role }, error: null };
        }
        return { user: null, error: 'Admin access required' };
      }
    }
  } catch {}
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
