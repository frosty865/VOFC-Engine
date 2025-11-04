// Server-side auth functions for API routes
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Secret key for JWT verification (must match the one used for signing)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export class AuthService {
  static async verifyToken(token) {
    try {
      if (!token) {
        return { success: false, error: 'No token provided' };
      }

      // Verify custom JWT token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      return { 
        success: true, 
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        }
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false, error: 'Token verification failed' };
    }
  }

  static getUserPermissions(role) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'admin'],
      spsa: ['read', 'write', 'delete'],
      psa: ['read', 'write'],
      analyst: ['read', 'write'],
      validator: ['read']
    };
    
    return permissions[role] || ['read'];
  }

  static async requireAuth(request) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return { user: null, error: 'Authentication required' };
    }

    const result = await this.verifyToken(token);
    if (!result.success) {
      return { user: null, error: result.error };
    }

    return { user: result.user, error: null };
  }

  static async requireAdmin(request) {
    const { user, error } = await this.requireAuth(request);
    if (error) {
      return { user: null, error };
    }

    if (!['admin', 'spsa'].includes(user.role)) {
      return { user: null, error: 'Admin access required' };
    }

    return { user, error: null };
  }
}
