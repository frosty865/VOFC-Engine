// Auth functions using Supabase authentication
import { supabase } from './supabaseClient';

export const getCurrentUser = async () => {
  try {
    // Get current Supabase session
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

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user profile:', profileError);
    }

    // Return user with profile data
    return {
      id: session.user.id,
      email: session.user.email,
      role: profile?.role || session.user.user_metadata?.role || 'user',
      name: profile?.full_name || session.user.user_metadata?.name || session.user.email,
      full_name: profile?.full_name || session.user.user_metadata?.name || session.user.email,
      ...profile
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getUserProfile = async (userId = null) => {
  try {
    let targetUserId = userId;
    
    // If no userId provided, get current user
    if (!targetUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      targetUserId = session.user.id;
    }

    // Get user profile from user_profiles table
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist yet, return basic user info
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.id === targetUserId) {
          return {
            id: session.user.id,
            email: session.user.email,
            role: session.user.user_metadata?.role || 'user',
            name: session.user.user_metadata?.name || session.user.email
          };
        }
      }
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    } else {
      window.location.href = '/splash';
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