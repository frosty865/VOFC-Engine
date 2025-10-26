-- Enable RLS on ALL remaining tables
-- This script ensures every table in the system has Row Level Security enabled

-- Core VOFC tables
ALTER TABLE public.options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;

-- User management tables (should already be enabled, but ensure they are)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- OFC requests table
ALTER TABLE public.ofc_requests ENABLE ROW LEVEL SECURITY;

-- Submission tables
ALTER TABLE public.submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_ofc_sources ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for tables that don't have them yet

-- OFC requests policies
CREATE POLICY "Authenticated users can read OFC requests" ON public.ofc_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage OFC requests" ON public.ofc_requests
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- Submission tables policies
CREATE POLICY "Authenticated users can read submission vulnerabilities" ON public.submission_vulnerabilities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage submission vulnerabilities" ON public.submission_vulnerabilities
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

CREATE POLICY "Authenticated users can read submission OFCs" ON public.submission_options_for_consideration
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage submission OFCs" ON public.submission_options_for_consideration
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

CREATE POLICY "Authenticated users can read submission sources" ON public.submission_sources
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage submission sources" ON public.submission_sources
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

CREATE POLICY "Authenticated users can read submission links" ON public.submission_vulnerability_ofc_links
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage submission links" ON public.submission_vulnerability_ofc_links
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

CREATE POLICY "Authenticated users can read submission OFC sources" ON public.submission_ofc_sources
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and SPSA can manage submission OFC sources" ON public.submission_ofc_sources
    FOR ALL USING (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa')
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofc_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_vulnerabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_options_for_consideration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_vulnerability_ofc_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_ofc_sources TO authenticated;

-- Revoke permissions from anonymous users
REVOKE ALL ON public.ofc_requests FROM anon;
REVOKE ALL ON public.submission_vulnerabilities FROM anon;
REVOKE ALL ON public.submission_options_for_consideration FROM anon;
REVOKE ALL ON public.submission_sources FROM anon;
REVOKE ALL ON public.submission_vulnerability_ofc_links FROM anon;
REVOKE ALL ON public.submission_ofc_sources FROM anon;
