import { AuthService } from './auth-server';
import { NextResponse } from 'next/server';

/**
 * Authenticates user via auth-token in cookie. Returns { user, error }.
 */
export async function requireAuth(request) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    };
  }
  const authResult = await AuthService.verifyToken(token);
  if (!authResult.success) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    };
  }
  return { user: authResult.user };
}

/**
 * Authenticates and checks admin role. Returns { user, error }.
 */
export async function requireAdmin(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };
  if (user.role !== 'admin') {
    return {
      error: NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    };
  }
  return { user };
}

/**
 * Authenticates and checks role membership. Roles: string[]
 */
export async function requireRole(request, roles) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };
  if (!roles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: `Role ${roles.join(',')} required` },
        { status: 403 }
      )
    };
  }
  return { user };
}
