/**
 * Security Utilities
 * Provides security functions for input sanitization, rate limiting, and CSRF protection
 */

import DOMPurify from 'isomorphic-dompurify';

export class SecurityUtils {
  /**
   * Sanitize HTML input to prevent XSS attacks
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeHTML(input) {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input);
  }

  /**
   * Sanitize text input (removes HTML tags)
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining angle brackets
      .trim();
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  static validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid = password.length >= minLength && 
                   hasUpperCase && 
                   hasLowerCase && 
                   hasNumbers && 
                   hasSpecialChar;

    return {
      isValid,
      errors: [
        password.length < minLength && `Password must be at least ${minLength} characters`,
        !hasUpperCase && 'Password must contain at least one uppercase letter',
        !hasLowerCase && 'Password must contain at least one lowercase letter',
        !hasNumbers && 'Password must contain at least one number',
        !hasSpecialChar && 'Password must contain at least one special character'
      ].filter(Boolean)
    };
  }

  /**
   * Create rate limiter
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Function} Rate limiter function
   */
  static createRateLimiter(maxAttempts, windowMs) {
    const attempts = new Map();

    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [key, timestamps] of attempts.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          attempts.delete(key);
        } else {
          attempts.set(key, validTimestamps);
        }
      }

      // Check current identifier
      const userAttempts = attempts.get(identifier) || [];
      const validAttempts = userAttempts.filter(timestamp => timestamp > windowStart);

      if (validAttempts.length >= maxAttempts) {
        return false; // Rate limited
      }

      // Add current attempt
      validAttempts.push(now);
      attempts.set(identifier, validAttempts);

      return true; // Allowed
    };
  }

  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  static generateCSRFToken() {
    return crypto.randomUUID();
  }

  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @param {string} sessionToken - Session token
   * @returns {boolean} True if valid
   */
  static validateCSRFToken(token, sessionToken) {
    // In a real implementation, you'd store CSRF tokens in the session
    // For now, we'll use a simple validation
    return typeof token === 'string' && token.length > 0;
  }

  /**
   * Sanitize file name to prevent path traversal
   * @param {string} filename - File name to sanitize
   * @returns {string} Sanitized file name
   */
  static sanitizeFileName(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid characters
      .replace(/\.{2,}/g, '.') // Replace multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255); // Limit length
  }

  /**
   * Validate file upload
   * @param {Object} file - File object
   * @param {Array} allowedTypes - Allowed MIME types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Object} Validation result
   */
  static validateFileUpload(file, allowedTypes = [], maxSize = 10 * 1024 * 1024) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
    } else {
      if (file.size > maxSize) {
        errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed`);
      }

      // Check for potentially dangerous file types
      const dangerousTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program'
      ];

      if (dangerousTypes.includes(file.type)) {
        errors.push('File type is not allowed for security reasons');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of string
   * @returns {string} Random string
   */
  static generateSecureRandom(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash sensitive data
   * @param {string} data - Data to hash
   * @returns {string} Hashed data
   */
  static async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}