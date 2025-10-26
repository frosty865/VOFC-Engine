// Clean Supabase authentication system
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Get custom user data from user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, first_name, last_name, organization, is_active')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      role: userProfile.role,
      name: `${userProfile.first_name} ${userProfile.last_name}`,
      organization: userProfile.organization,
      is_active: userProfile.is_active
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if user can access admin functions
export const canAccessAdmin = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return ['admin', 'spsa', 'psa', 'analyst'].includes(user.role);
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

// Check if user can submit VOFC
export const canSubmitVOFC = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return ['admin', 'spsa', 'psa', 'analyst'].includes(user.role);
  } catch (error) {
    console.error('Error checking submit access:', error);
    return false;
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

export { supabase };
