-- Production Database Setup for VOFC Engine
-- This script sets up the user authentication system for production

-- 1. Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    first_name TEXT,
    last_name TEXT,
    organization TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert default user groups
INSERT INTO public.user_groups (name, display_name, description, permissions) VALUES
(
    'admin',
    'Administrator',
    'Full system access, can manage all users and content',
    '{
        "can_manage_users": true,
        "can_edit_ofc": true,
        "can_delete_ofc": true,
        "can_submit_doc": true,
        "can_view_analytics": true,
        "can_manage_system": true
    }'::jsonb
),
(
    'spsa',
    'Senior PSA',
    'Senior Protective Security Advisor with elevated privileges',
    '{
        "can_manage_users": true,
        "can_edit_ofc": true,
        "can_delete_ofc": true,
        "can_submit_doc": true,
        "can_view_analytics": true,
        "can_manage_system": false
    }'::jsonb
),
(
    'psa',
    'PSA',
    'Protective Security Advisor with standard privileges',
    '{
        "can_manage_users": false,
        "can_edit_ofc": true,
        "can_delete_ofc": false,
        "can_submit_doc": true,
        "can_view_analytics": true,
        "can_manage_system": false
    }'::jsonb
),
(
    'analyst',
    'Analyst',
    'Security Analyst with read and submit privileges',
    '{
        "can_manage_users": false,
        "can_edit_ofc": true,
        "can_delete_ofc": false,
        "can_submit_doc": true,
        "can_view_analytics": false,
        "can_manage_system": false
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_groups_name ON public.user_groups(name);

-- 5. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" ON public.user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- User groups policies
CREATE POLICY "Allow public read access to user_groups" ON public.user_groups
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage user_groups" ON public.user_groups
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role, first_name, last_name, organization, is_active)
    VALUES (
        NEW.id,
        CASE 
            WHEN NEW.email LIKE '%@vofc.gov' THEN 'admin'
            WHEN NEW.email LIKE '%spsa%' THEN 'spsa'
            WHEN NEW.email LIKE '%psa%' THEN 'psa'
            ELSE 'analyst'
        END,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'organization', ''),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Create default admin user if it doesn't exist
-- Note: This will only work if the user doesn't already exist
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@vofc.gov',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Admin", "last_name": "User", "organization": "VOFC"}',
    false,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 10. Create SPSA user if it doesn't exist
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'spsa@vofc.gov',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "SPSA", "last_name": "User", "organization": "VOFC"}',
    false,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 11. Ensure user profiles are created for existing users
INSERT INTO public.user_profiles (user_id, role, first_name, last_name, organization, is_active)
SELECT 
    u.id,
    CASE 
        WHEN u.email LIKE '%@vofc.gov' THEN 'admin'
        WHEN u.email LIKE '%spsa%' THEN 'spsa'
        WHEN u.email LIKE '%psa%' THEN 'psa'
        ELSE 'analyst'
    END,
    COALESCE(u.raw_user_meta_data->>'first_name', ''),
    COALESCE(u.raw_user_meta_data->>'last_name', ''),
    COALESCE(u.raw_user_meta_data->>'organization', ''),
    true
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- 12. Create backup_metadata table for backup system
CREATE TABLE IF NOT EXISTS public.backup_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'completed'
);

-- Enable RLS for backup_metadata
ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy for backup_metadata
CREATE POLICY "Service role can manage backup_metadata" ON public.backup_metadata
    FOR ALL USING (auth.role() = 'service_role');

COMMIT;
