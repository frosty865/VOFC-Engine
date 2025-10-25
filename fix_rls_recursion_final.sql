-- Final fix for RLS recursion issue
-- This script completely removes and recreates RLS policies to eliminate recursion

-- First, drop all existing policies on user_profiles
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_self_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_authenticated_policy" ON public.user_profiles;

-- Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Allow authenticated users to read their own profile
CREATE POLICY "user_profiles_own_read" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Allow authenticated users to update their own profile
CREATE POLICY "user_profiles_own_update" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy 3: Allow admin and spsa roles to read all profiles
CREATE POLICY "user_profiles_admin_read" ON public.user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'spsa')
        )
    );

-- Policy 4: Allow admin and spsa roles to update all profiles
CREATE POLICY "user_profiles_admin_update" ON public.user_profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'spsa')
        )
    );

-- Policy 5: Allow admin and spsa roles to insert new profiles
CREATE POLICY "user_profiles_admin_insert" ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'spsa')
        )
    );

-- Policy 6: Allow admin and spsa roles to delete profiles
CREATE POLICY "user_profiles_admin_delete" ON public.user_profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'spsa')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;

-- Verify the policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;
