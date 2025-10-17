// Simple auth functions for admin pages
export const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('🔐 Auth - User loaded:', result.user);
        return result.user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return result.user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const canAccessAdmin = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return ['admin', 'spsa', 'analyst'].includes(user.role);
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

export const canSubmitVOFC = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return ['admin', 'spsa', 'analyst', 'psa'].includes(user.role);
  } catch (error) {
    console.error('Error checking submit access:', error);
    return false;
  }
};

export const logout = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      window.location.href = '/splash';
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// User role constants and utilities
export const USER_ROLES = {
  ADMIN: 'admin',
  SPSA: 'spsa',
  PSA: 'psa',
  ANALYST: 'analyst',
  VALIDATOR: 'validator'
};

export const getRoleDisplayName = (role) => {
  const roleNames = {
    'admin': 'Administrator',
    'spsa': 'Senior PSA',
    'psa': 'PSA',
    'analyst': 'Analyst',
    'validator': 'Validator'
  };
  return roleNames[role] || role;
};

export const getRoleBadgeColor = (role) => {
  const colors = {
    'admin': 'bg-red-100 text-red-800',
    'spsa': 'bg-purple-100 text-purple-800',
    'psa': 'bg-blue-100 text-blue-800',
    'analyst': 'bg-green-100 text-green-800',
    'validator': 'bg-yellow-100 text-yellow-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};