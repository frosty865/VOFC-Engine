/**
 * Secure Authentication Client
 * Handles all client-side authentication with server-side verification
 */

class AuthClient {
  /**
   * Get current authenticated user
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  static async getCurrentUser() {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.user) {
        return result.user;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Login user with credentials
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result
   */
  static async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  }

  /**
   * Logout current user
   * @returns {Promise<Object>} Logout result
   */
  static async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        success: false,
        error: 'Logout failed. Please try again.',
      };
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} True if user has permission
   */
  static async hasPermission(permission) {
    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success && result.permissions && result.permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get user permissions
   * @returns {Promise<Array>} Array of user permissions
   */
  static async getPermissions() {
    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.success ? result.permissions : [];
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  }
}

export { AuthClient };

