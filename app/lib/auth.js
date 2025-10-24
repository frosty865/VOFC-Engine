// Simple auth functions for admin pages
export const getCurrentUser = async () => {
  try {
    // Use Supabase Auth directly instead of custom JWT
    const { createClient } = await import('./supabaseClient');
    const supabase = createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Map user email to role
    const roleMap = {
      'admin@vofc.gov': 'admin',
      'spsa@vofc.gov': 'spsa', 
      'psa@vofc.gov': 'psa',
      'analyst@vofc.gov': 'analyst'
    };

    const role = roleMap[user.email] || 'user';
    const name = user.user_metadata?.name || user.email.split('@')[0];
    
    return {
      id: user.id,
      email: user.email,
      role: role,
      name: name
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getUserProfile = async () => {
  // Use the same function as getCurrentUser since we're using Supabase Auth
  return await getCurrentUser();
};

export const canAccessAdmin = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return ['admin', 'spsa', 'analyst', 'psa'].includes(user.role);
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