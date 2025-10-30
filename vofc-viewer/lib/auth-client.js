/**
 * Client-side authentication utilities
 * Updated to use Supabase authentication
 */
import { supabase } from '../app/lib/supabaseClient';

export class AuthClient {
  /**
   * Get current user using Supabase
   */
  static async getCurrentUser() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        return null;
      }

      // Get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }

      return {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || session.user.user_metadata?.role || 'user',
        name: profile?.full_name || session.user.user_metadata?.name || session.user.email
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Login user using Supabase
   */
  static async login(username, password) {
    try {
      const email = username.includes('@') ? username : `${username}@vofc.gov`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get user profile for role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: profile?.role || data.user.user_metadata?.role || 'user',
          name: profile?.full_name || data.user.user_metadata?.name || data.user.email
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Logout user using Supabase
   */
  static async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      // Redirect to login page
      window.location.href = '/splash';
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Get user role
   */
  static async getUserRole() {
    const user = await this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(permission) {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Basic permission check based on role
      const rolePermissions = {
        admin: ['read', 'write', 'delete', 'admin'],
        spsa: ['read', 'write', 'delete'],
        psa: ['read', 'write'],
        analyst: ['read', 'write'],
        validator: ['read']
      };

      const permissions = rolePermissions[user.role] || ['read'];
      return permissions.includes(permission);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Redirect to login if not authenticated
   */
  static async requireAuth(redirectTo = '/splash') {
    const isAuthenticated = await this.isAuthenticated();
    if (!isAuthenticated) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
}

export default AuthClient;

