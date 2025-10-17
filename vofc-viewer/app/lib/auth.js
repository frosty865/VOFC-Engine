import { AuthClient } from './auth-client';

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SPSA: 'spsa',
  PSA: 'psa',
  ANALYST: 'analyst'
};

// Role display names
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [USER_ROLES.ADMIN]: 'Administrator',
    [USER_ROLES.SPSA]: 'SPSA',
    [USER_ROLES.PSA]: 'PSA',
    [USER_ROLES.ANALYST]: 'Analyst'
  };
  return roleNames[role] || role;
};

// Role badge colors
export const getRoleBadgeColor = (role) => {
  const colors = {
    [USER_ROLES.ADMIN]: 'bg-danger text-white',
    [USER_ROLES.SPSA]: 'bg-warning text-white',
    [USER_ROLES.PSA]: 'bg-info text-white',
    [USER_ROLES.ANALYST]: 'bg-success text-white'
  };
  return colors[role] || 'bg-secondary text-white';
};

// Get current user - now uses secure server-side authentication
export const getCurrentUser = async () => {
  try {
    return await AuthClient.getCurrentUser();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get user profile
export const getUserProfile = async (userId = null) => {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const user = await getCurrentUser();
      if (!user) return null;
      targetUserId = user.id;
    }

    // For our custom auth system, return the user data directly
    // since we already have all the profile info in localStorage
    const user = await getCurrentUser();
    if (!user) return null;

    return {
      user_id: user.id,
      username: user.username,
      role: user.role,
      first_name: user.full_name?.split(' ')[0] || '',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
      organization: user.organization,
      is_active: true
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Check if user can manage users
export const canManageUsers = async () => {
  try {
    const profile = await getUserProfile();
    if (!profile) return false;

    return profile.role === USER_ROLES.ADMIN || profile.role === USER_ROLES.SPSA;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
};

// Check if user can access admin
export const canAccessAdmin = async () => {
  try {
    const profile = await getUserProfile();
    if (!profile) return false;

    return profile.role === USER_ROLES.ADMIN ||
      profile.role === USER_ROLES.SPSA ||
      profile.role === USER_ROLES.ANALYST;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

// Check if user can submit VOFC
export const canSubmitVOFC = async () => {
  try {
    const profile = await getUserProfile();
    if (!profile) return false;

    return profile.role === USER_ROLES.ADMIN ||
      profile.role === USER_ROLES.SPSA ||
      profile.role === USER_ROLES.PSA;
  } catch (error) {
    console.error('Error checking VOFC submission access:', error);
    return false;
  }
};

// Get all users (admin/SPSA only)
export const getAllUsers = async () => {
  try {
    const canManage = await canManageUsers();
    if (!canManage) {
      throw new Error('Insufficient permissions');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        auth_users:user_id (
          id,
          email,
          created_at,
          last_sign_in_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Create user
export const createUser = async (userData) => {
  try {
    const canManage = await canManageUsers();
    if (!canManage) {
      throw new Error('Insufficient permissions');
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        username: userData.username,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        organization: userData.organization,
        is_active: true
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return profileData;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (userId, userData) => {
  try {
    const canManage = await canManageUsers();
    if (!canManage) {
      throw new Error('Insufficient permissions');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        username: userData.username,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        organization: userData.organization,
        is_active: userData.is_active
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    const canManage = await canManageUsers();
    if (!canManage) {
      throw new Error('Insufficient permissions');
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) throw profileError;

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Logout user - now uses secure server-side logout
export const logout = async () => {
  try {
    return await AuthClient.logout();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};