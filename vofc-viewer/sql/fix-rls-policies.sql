-- Fix RLS Policy Recursion Issues
-- This script removes the problematic circular reference policy

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON vofc_users;

-- Create a simpler policy that doesn't self-reference
-- This allows users to see their own data and admins to see all data
-- without causing recursion
CREATE POLICY "Users can view own data and admins can view all" ON vofc_users FOR SELECT USING (
    -- Users can see their own data
    auth.uid()::text = user_id::text
    OR
    -- Allow service role to bypass RLS (for API calls)
    auth.role() = 'service_role'
);

-- Create separate policy for admin operations
CREATE POLICY "Admins can manage users" ON vofc_users FOR ALL USING (
    -- Allow service role to bypass RLS (for API calls)
    auth.role() = 'service_role'
    OR
    -- Allow users to update their own data
    auth.uid()::text = user_id::text
);

-- Ensure user_sessions has proper RLS
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (
    user_id::text = auth.uid()::text
    OR
    auth.role() = 'service_role'
);

-- Ensure user_permissions has proper RLS
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" ON user_permissions FOR SELECT USING (
    user_id::text = auth.uid()::text
    OR
    auth.role() = 'service_role'
);

-- Add policy for sources table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sources' 
        AND policyname = 'sources_are_public'
    ) THEN
        CREATE POLICY "sources_are_public" ON sources FOR SELECT USING (true);
    END IF;
END $$;
