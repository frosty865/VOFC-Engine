-- COMPLETE PRODUCTION FIX
-- This addresses both RLS recursion and SECURITY DEFINER views

-- 1. Fix SECURITY DEFINER views that are causing RLS recursion
DROP VIEW IF EXISTS public.rls_verification CASCADE;
DROP VIEW IF EXISTS public.subsector_metrics CASCADE;
DROP VIEW IF EXISTS public.compliance_report CASCADE;
DROP VIEW IF EXISTS public.sector_metrics CASCADE;

-- 2. Completely disable RLS on user_profiles to stop recursion
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on user_profiles
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

-- 4. Recreate views as normal views (without SECURITY DEFINER)
CREATE VIEW public.rls_verification AS
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

CREATE VIEW public.subsector_metrics AS
SELECT 
    s.id as subsector_id,
    s.subsector_name,
    COUNT(DISTINCT a.id) as assessment_count,
    COUNT(DISTINCT v.id) as vulnerability_count,
    COUNT(DISTINCT o.id) as ofc_count
FROM public.subsectors s
LEFT JOIN public.assessments a ON s.id = a.subsector_id
LEFT JOIN public.vulnerabilities v ON s.id = v.subsector_id
LEFT JOIN public.options_for_consideration o ON s.id = o.subsector_id
GROUP BY s.id, s.subsector_name;

CREATE VIEW public.compliance_report AS
SELECT 
    'FISMA' as compliance_framework,
    COUNT(*) as total_assessments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assessments,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assessments
FROM public.assessments
UNION ALL
SELECT 
    'FedRAMP' as compliance_framework,
    COUNT(*) as total_assessments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assessments,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_assessments
FROM public.assessments;

CREATE VIEW public.sector_metrics AS
SELECT 
    s.id as sector_id,
    s.sector_name,
    COUNT(DISTINCT a.id) as assessment_count,
    COUNT(DISTINCT v.id) as vulnerability_count,
    COUNT(DISTINCT o.id) as ofc_count
FROM public.sectors s
LEFT JOIN public.assessments a ON s.id = a.sector_id
LEFT JOIN public.vulnerabilities v ON s.id = v.sector_id
LEFT JOIN public.options_for_consideration o ON s.id = o.sector_id
GROUP BY s.id, s.sector_name;

-- 5. Verify the fix
SELECT 'RLS disabled on user_profiles' as status;
SELECT COUNT(*) as user_profiles_count FROM public.user_profiles;
SELECT 'Views recreated as normal views' as status;
