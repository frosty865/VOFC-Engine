-- Comprehensive RLS Security Fix
-- This script ensures proper Row Level Security across all tables

-- 1. Enable RLS on all critical tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public read access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admin to manage all profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "Allow public read access to user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Allow admin to manage user_groups" ON public.user_groups;

-- 3. Create secure policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 4. Create secure policies for user_groups
CREATE POLICY "Allow authenticated users to read user_groups" ON public.user_groups
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage user_groups" ON public.user_groups
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 5. Create secure policies for options_for_consideration
CREATE POLICY "Authenticated users can read OFCs" ON public.options_for_consideration
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage OFCs" ON public.options_for_consideration
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- 6. Create secure policies for vulnerabilities
CREATE POLICY "Authenticated users can read vulnerabilities" ON public.vulnerabilities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage vulnerabilities" ON public.vulnerabilities
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- 7. Create secure policies for sources
CREATE POLICY "Authenticated users can read sources" ON public.sources
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage sources" ON public.sources
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- 8. Create secure policies for vulnerability_ofc_links
CREATE POLICY "Authenticated users can read links" ON public.vulnerability_ofc_links
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage links" ON public.vulnerability_ofc_links
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- 9. Secure old tables (if they still exist)
-- Drop old tables or secure them
DROP TABLE IF EXISTS public.vofc_users CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- 10. Create helper function for role checking
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create helper function for permission checking
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    group_permissions JSONB;
BEGIN
    -- Get user's role
    SELECT role INTO user_role FROM public.user_profiles 
    WHERE user_profiles.user_id = auth.uid();
    
    -- Get permissions for the role
    SELECT permissions INTO group_permissions FROM public.user_groups 
    WHERE user_groups.name = user_role;
    
    -- Check if permission exists and is true
    RETURN (group_permissions->permission_name)::boolean = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_groups_name ON public.user_groups(name);

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.options_for_consideration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vulnerabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vulnerability_ofc_links TO authenticated;

-- 14. Revoke permissions from anonymous users
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_groups FROM anon;
REVOKE ALL ON public.options_for_consideration FROM anon;
REVOKE ALL ON public.vulnerabilities FROM anon;
REVOKE ALL ON public.sources FROM anon;
REVOKE ALL ON public.vulnerability_ofc_links FROM anon;
