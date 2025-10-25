import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export class AuthService {
  static async verifyToken(token) {
    try {
      if (!token) {
        return { success: false, error: 'No token provided' };
      }
      
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

  static async getUserPermissions(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('user_id', userId)
        .single();

      if (error || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      const permissions = {
        canViewAdmin: ['admin', 'spsa', 'analyst'].includes(profile.role),
        canManageUsers: profile.role === 'admin',
        canManageOFCs: ['admin', 'spsa', 'analyst'].includes(profile.role),
        canViewReports: ['admin', 'spsa', 'analyst'].includes(profile.role)
      };

      return {
        success: true,
        permissions
      };
    } catch (error) {
      console.error('Permission check error:', error);
      return { success: false, error: 'Failed to check permissions' };
    }
  }
}