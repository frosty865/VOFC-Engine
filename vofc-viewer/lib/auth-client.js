/**
 * Client-side authentication utilities
 * No localStorage usage - all authentication handled server-side
 */
export class AuthClient {
  /**
   * Get current user from server
   */
  static async getCurrentUser() {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.success ? result.user : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Login user
   */
  static async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Logout user
   */
  static async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      const result = await response.json();
      
      // Redirect to login page
      if (result.success) {
        window.location.href = '/splash';
      }
      
      return result;
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
      const response = await fetch(`/api/auth/permissions?permission=${permission}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success && result.hasPermission;
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

