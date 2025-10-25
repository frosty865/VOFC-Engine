-- User Profiles Table for Supabase Auth Integration
-- This extends Supabase's built-in auth.users table with custom fields

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    name TEXT,
    agency_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role, name)
    VALUES (
        NEW.id,
        CASE 
            WHEN NEW.email LIKE '%@vofc.gov' THEN 'admin'
            WHEN NEW.email LIKE '%spsa%' THEN 'spsa'
            WHEN NEW.email LIKE '%psa%' THEN 'psa'
            ELSE 'user'
        END,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default admin user if it doesn't exist
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
    last_sign_in_at,
    raw_user_meta_data
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
    '{"name": "Administrator"}',
    false,
    NOW(),
    '{"name": "Administrator"}'
) ON CONFLICT (email) DO NOTHING;

-- Insert SPSA user if it doesn't exist
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
    last_sign_in_at,
    raw_user_meta_data
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
    '{"name": "SPSA User"}',
    false,
    NOW(),
    '{"name": "SPSA User"}'
) ON CONFLICT (email) DO NOTHING;
