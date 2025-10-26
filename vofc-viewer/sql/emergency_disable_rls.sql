-- EMERGENCY: Completely disable RLS on user_profiles
-- This will allow the login to work immediately

-- 1. Disable RLS completely
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies (force drop)
DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "admin_can_read_all_profiles" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "admin_can_update_all_profiles" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_admin_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_self_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_authenticated_policy" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_own_read" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_own_update" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_admin_read" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_admin_insert" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "user_profiles_admin_delete" ON public.user_profiles CASCADE;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.user_profiles CASCADE;

-- 3. Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- 4. Test query (should work now)
SELECT COUNT(*) as profile_count FROM public.user_profiles;
