-- Fix RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_read_submissions" ON submissions;
DROP POLICY IF EXISTS "admin_update_submissions" ON submissions;
DROP POLICY IF EXISTS "users_insert_submissions" ON submissions;
DROP POLICY IF EXISTS "admin_read_vulnerabilities" ON vulnerabilities;
DROP POLICY IF EXISTS "admin_read_ofcs" ON options_for_consideration;
DROP POLICY IF EXISTS "admin_read_profiles" ON user_profiles;

-- Create policies for submissions table
-- Allow admins to read all submissions
CREATE POLICY "admin_read_submissions" ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'spsa', 'analyst')
    )
  );

-- Allow admins to update submissions (for approval/rejection)
CREATE POLICY "admin_update_submissions" ON submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'spsa')
    )
  );

-- Allow users to insert submissions
CREATE POLICY "users_insert_submissions" ON submissions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for vulnerabilities table
-- Allow everyone to read approved vulnerabilities
CREATE POLICY "public_read_vulnerabilities" ON vulnerabilities
  FOR SELECT
  USING (true);

-- Allow admins to insert vulnerabilities
CREATE POLICY "admin_insert_vulnerabilities" ON vulnerabilities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'spsa')
    )
  );

-- Create policies for OFCs table
-- Allow everyone to read approved OFCs
CREATE POLICY "public_read_ofcs" ON options_for_consideration
  FOR SELECT
  USING (true);

-- Allow admins to insert OFCs
CREATE POLICY "admin_insert_ofcs" ON options_for_consideration
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'spsa')
    )
  );

-- Create policies for user_profiles table
-- Allow admins to read profiles
CREATE POLICY "admin_read_profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'spsa')
    )
  );

-- Allow users to read their own profile
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create policies for sectors and subsectors
-- Allow everyone to read sectors and subsectors
CREATE POLICY "public_read_sectors" ON sectors
  FOR SELECT
  USING (true);

CREATE POLICY "public_read_subsectors" ON subsectors
  FOR SELECT
  USING (true);

