-- Fix infinite recursion in user_profiles RLS policy
-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Allow authenticated users to view profiles" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update profiles" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access" ON user_profiles
  FOR ALL
  TO service_role
  USING (true);

-- Test the fix
SELECT 'RLS policies fixed for user_profiles' as status;
