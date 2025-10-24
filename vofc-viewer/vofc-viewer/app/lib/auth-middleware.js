// Auth middleware functions for API routes
import { AuthService } from './auth-server.js';

export async function requireAuth(request) {
  return await AuthService.requireAuth(request);
}

export async function requireAdmin(request) {
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
