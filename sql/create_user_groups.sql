-- Create user_groups table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 4 user groups
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

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to user_groups" ON public.user_groups
    FOR SELECT USING (true);

CREATE POLICY "Allow admin to manage user_groups" ON public.user_groups
    FOR ALL USING (auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_groups_name ON public.user_groups(name);
CREATE INDEX IF NOT EXISTS idx_user_groups_permissions ON public.user_groups USING GIN(permissions);
