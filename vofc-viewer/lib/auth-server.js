/**
 * Server-side Authentication Service
 * Handles secure authentication with JWT tokens and database verification
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'your-64-character-secret-key-change-this-in-production';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class AuthService {
  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Authentication result
   */
  static async authenticateUser(username, password) {
    try {
      // Get user from database
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

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed attempts'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        await supabase
          .from('vofc_users')
          .update({
            failed_login_attempts: user.failed_login_attempts + 1,
            locked_until: user.failed_login_attempts >= 4 ? 
              new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
          })
          .eq('user_id', user.user_id);

        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Reset failed login attempts on successful login
      await supabase
        .from('vofc_users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          role: user.role,
          agency: user.agency
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Create session record
      const sessionId = require('crypto').randomUUID();
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
        token,
        sessionId
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Verify JWT token and get user
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Verification result
   */
  static async verifyToken(token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, jwtSecret);
      
      // Check if session exists and is valid
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
        .eq('expires_at', '>', new Date().toISOString())
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

  /**
   * Logout user and invalidate session
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Logout result
   */
  static async logoutUser(token) {
    try {
      // Remove session from database
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token);

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  /**
   * Get user permissions based on role
   * @param {string} role - User role
   * @returns {Array} Array of permissions
   */
  static getUserPermissions(role) {
    const permissions = {
      admin: [
        'read:all',
        'write:all',
        'delete:all',
        'manage:users',
        'manage:backups',
        'view:metrics',
        'submit:vofc'
      ],
      spsa: [
        'read:all',
        'write:all',
        'manage:users',
        'submit:vofc'
      ],
      psa: [
        'read:all',
        'write:all',
        'submit:vofc'
      ],
      analyst: [
        'read:all',
        'submit:vofc'
      ]
    };

    return permissions[role] || [];
  }
}