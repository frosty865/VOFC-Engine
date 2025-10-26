-- Fix SECURITY DEFINER views that are causing RLS recursion
-- These views are enforcing the wrong permissions

-- 1. Drop the problematic SECURITY DEFINER views
DROP VIEW IF EXISTS public.rls_verification CASCADE;
DROP VIEW IF EXISTS public.subsector_metrics CASCADE;
DROP VIEW IF EXISTS public.compliance_report CASCADE;
DROP VIEW IF EXISTS public.sector_metrics CASCADE;

-- 2. Recreate them as normal views (without SECURITY DEFINER)
-- This will use the querying user's permissions instead of the view creator's

-- Recreate rls_verification as normal view
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

-- Recreate subsector_metrics as normal view
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

-- Recreate compliance_report as normal view
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

-- Recreate sector_metrics as normal view
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

-- 3. Verify the views are now normal (not SECURITY DEFINER)
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('rls_verification', 'subsector_metrics', 'compliance_report', 'sector_metrics');
