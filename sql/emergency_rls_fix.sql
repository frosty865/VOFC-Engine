-- EMERGENCY RLS FIX FOR GOVERNMENT COMPLIANCE
-- This script ensures ALL tables have RLS enabled and anonymous access blocked

-- Step 1: Enable RLS on ALL tables
ALTER TABLE public.options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_ofc_sources ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies that might conflict
DROP POLICY IF EXISTS "govt_ofc_read_policy" ON public.options_for_consideration;
DROP POLICY IF EXISTS "govt_ofc_manage_policy" ON public.options_for_consideration;
DROP POLICY IF EXISTS "govt_vuln_read_policy" ON public.vulnerabilities;
DROP POLICY IF EXISTS "govt_vuln_manage_policy" ON public.vulnerabilities;
DROP POLICY IF EXISTS "govt_sources_read_policy" ON public.sources;
DROP POLICY IF EXISTS "govt_sources_manage_policy" ON public.sources;
DROP POLICY IF EXISTS "govt_links_read_policy" ON public.vulnerability_ofc_links;
DROP POLICY IF EXISTS "govt_links_manage_policy" ON public.vulnerability_ofc_links;

-- Step 3: Create simple, effective policies that block anonymous access
-- Options for Consideration
CREATE POLICY "block_anonymous_ofc" ON public.options_for_consideration
    FOR ALL USING (auth.role() = 'authenticated');

-- Vulnerabilities  
CREATE POLICY "block_anonymous_vuln" ON public.vulnerabilities
    FOR ALL USING (auth.role() = 'authenticated');

-- Sources
CREATE POLICY "block_anonymous_sources" ON public.sources
    FOR ALL USING (auth.role() = 'authenticated');

-- Vulnerability-OFC Links
CREATE POLICY "block_anonymous_links" ON public.vulnerability_ofc_links
    FOR ALL USING (auth.role() = 'authenticated');

-- User Profiles
CREATE POLICY "block_anonymous_profiles" ON public.user_profiles
    FOR ALL USING (auth.role() = 'authenticated');

-- User Groups
CREATE POLICY "block_anonymous_groups" ON public.user_groups
    FOR ALL USING (auth.role() = 'authenticated');

-- OFC Requests
CREATE POLICY "block_anonymous_requests" ON public.ofc_requests
    FOR ALL USING (auth.role() = 'authenticated');

-- Submission Tables
CREATE POLICY "block_anonymous_sub_vuln" ON public.submission_vulnerabilities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "block_anonymous_sub_ofc" ON public.submission_options_for_consideration
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "block_anonymous_sub_sources" ON public.submission_sources
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "block_anonymous_sub_links" ON public.submission_vulnerability_ofc_links
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "block_anonymous_sub_ofc_sources" ON public.submission_ofc_sources
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Revoke ALL permissions from anonymous users
REVOKE ALL ON public.options_for_consideration FROM anon;
REVOKE ALL ON public.vulnerabilities FROM anon;
REVOKE ALL ON public.sources FROM anon;
REVOKE ALL ON public.vulnerability_ofc_links FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_groups FROM anon;
REVOKE ALL ON public.ofc_requests FROM anon;
REVOKE ALL ON public.submission_vulnerabilities FROM anon;
REVOKE ALL ON public.submission_options_for_consideration FROM anon;
REVOKE ALL ON public.submission_sources FROM anon;
REVOKE ALL ON public.submission_vulnerability_ofc_links FROM anon;
REVOKE ALL ON public.submission_ofc_sources FROM anon;

-- Step 5: Grant permissions to authenticated users only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.options_for_consideration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vulnerabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vulnerability_ofc_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofc_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_vulnerabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_options_for_consideration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_vulnerability_ofc_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_ofc_sources TO authenticated;
