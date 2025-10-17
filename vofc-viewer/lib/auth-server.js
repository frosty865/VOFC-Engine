const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const tokenExpiresIn = '24h';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class AuthService {
  static async authenticateUser(username, password) {
    try {
      const { data: user, error } = await supabase
        .from('vofc_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const token = jwt.sign(
        { 
          userId: user.user_id, 
          username: user.username, 
          role: user.role 
        },
        jwtSecret,
        { expiresIn: tokenExpiresIn }
      );

      const sessionId = crypto.randomUUID();
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.user_id,
          session_token: token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      return {
        success: true,
        user: {
          id: user.user_id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          agency: user.agency
        },
        token: token
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);

      const { data: session, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          user:user_id (
            user_id,
            username,
            full_name,
            role,
            agency,
            is_active
          )
        `)
        .eq('session_token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !session || !session.user) {
        return {
          success: false,
          error: 'Invalid or expired session'
        };
      }

      return {
        success: true,
        user: {
          id: session.user.user_id,
          username: session.user.username,
          full_name: session.user.full_name,
          role: session.user.role,
          agency: session.user.agency
        }
      };

    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  static async invalidateSession(sessionId) {
    try {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId);

      return { success: true };
    } catch (error) {
      console.error('Session invalidation error:', error);
      return { success: false, error: 'Failed to invalidate session' };
    }
  }

  static async getUserPermissions(userId) {
    try {
      const { data: user, error } = await supabase
        .from('vofc_users')
        .select('role, is_active')
        .eq('user_id', userId)
        .single();

      if (error || !user) {
        return { success: false, error: 'User not found' };
      }

      const permissions = {
        canViewAdmin: ['admin', 'spsa', 'analyst'].includes(user.role),
        canManageUsers: user.role === 'admin',
        canManageOFCs: ['admin', 'spsa', 'analyst'].includes(user.role),
        canViewReports: ['admin', 'spsa', 'analyst'].includes(user.role)
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