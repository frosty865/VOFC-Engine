// Supabase-based authentication system
import { getCurrentUser as supabaseGetCurrentUser, signIn, signOut, canAccessAdmin as supabaseCanAccessAdmin, canSubmitVOFC as supabaseCanSubmitVOFC, USER_ROLES, getRoleDisplayName, getRoleBadgeColor } from './auth-supabase';

export const getCurrentUser = supabaseGetCurrentUser;

export const getUserProfile = async () => {
  // Use the same function as getCurrentUser since we're using Supabase Auth
  return await getCurrentUser();
};

export const canAccessAdmin = supabaseCanAccessAdmin;
export const canSubmitVOFC = supabaseCanSubmitVOFC;
export const logout = signOut;
export { USER_ROLES, getRoleDisplayName, getRoleBadgeColor };