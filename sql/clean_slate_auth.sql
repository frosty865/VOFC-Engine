-- CLEAN SLATE AUTHENTICATION SETUP
-- Remove all existing user tables and start fresh with proper Supabase auth

-- 1. DROP ALL EXISTING USER TABLES
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_groups CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.vofc_users CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 2. DROP ALL RLS POLICIES ON USER TABLES
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_self_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_authenticated_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_read" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_read" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_delete" ON public.user_profiles;

-- 3. CREATE CLEAN USER PROFILES TABLE
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'analyst',
    first_name TEXT,
    last_name TEXT,
    organization TEXT DEFAULT 'VOFC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- 4. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. CREATE SIMPLE RLS POLICIES
-- Allow users to read their own profile
CREATE POLICY "users_can_read_own_profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow admin users to read all profiles
CREATE POLICY "admin_can_read_all_profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Allow admin users to update all profiles
CREATE POLICY "admin_can_update_all_profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Allow admin users to insert new profiles
CREATE POLICY "admin_can_insert_profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;

-- 7. CREATE INDEXES
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- 8. CREATE FUNCTION TO AUTO-CREATE USER PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, role, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        'analyst', -- default role
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CREATE TRIGGER FOR AUTO-PROFILE CREATION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. VERIFY CLEAN SETUP
SELECT 'Clean authentication setup completed' as status;
