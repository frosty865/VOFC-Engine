import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get user ID from email address
 * @param {string} email - User's email address
 * @returns {Promise<string|null>} - User ID (UUID) or null if not found
 */
export async function getUserIdFromEmail(email) {
  try {
    if (!email || !email.includes('@')) {
      return null;
    }

    // Try to find user in auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (!authError && authUser?.user?.id) {
      return authUser.user.id;
    }

    // If not found in auth, try to find in a custom users table
    const { data: customUser, error: customError } = await supabase
      .from('vofc_users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (!customError && customUser?.user_id) {
      return customUser.user_id;
    }

    console.log(`User not found for email: ${email}`);
    return null;
  } catch (error) {
    console.error('Error getting user ID from email:', error);
    return null;
  }
}

/**
 * Validate if a string is a valid UUID
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid UUID
 */
export function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Get processed_by value, converting email to UUID if needed
 * @param {string} processedBy - Email or UUID
 * @returns {Promise<string|null>} - Valid UUID or null
 */
export async function getProcessedByValue(processedBy) {
  if (!processedBy) {
    return null;
  }

  // If it's already a valid UUID, return it
  if (isValidUUID(processedBy)) {
    return processedBy;
  }

  // If it's an email, try to convert to UUID
  if (processedBy.includes('@')) {
    return await getUserIdFromEmail(processedBy);
  }

  return null;
}
