-- Safe Database Performance Optimization Script
-- Only creates indexes for tables that actually exist

-- First, let's check what tables exist and create indexes only for those
-- This script is designed to be safe and only work with existing tables

-- 1. Add indexes for core tables that we know exist
-- User and authentication tables
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON public.user_profiles(organization);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON public.user_profiles(created_by);

-- 2. Add indexes for tables that are likely to exist based on the schema
-- (We'll add these one by one to avoid errors)

-- Try to add indexes for assessment tables (if they exist)
DO $$
BEGIN
    -- Check if assessment_metrics exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_metrics' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_assessment_metrics_assessment_id ON public.assessment_metrics(assessment_id);
    END IF;
    
    -- Check if assessment_ofcs exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_ofcs' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_assessment_ofcs_assessment_id ON public.assessment_ofcs(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_ofcs_ofc_id ON public.assessment_ofcs(ofc_id);
    END IF;
    
    -- Check if assessment_responses exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_responses' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON public.assessment_responses(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON public.assessment_responses(question_id);
    END IF;
    
    -- Check if assessment_vulns exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_vulns' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_assessment_vulns_assessment_id ON public.assessment_vulns(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_vulns_vulnerability_id ON public.assessment_vulns(vulnerability_id);
    END IF;
    
    -- Check if assessments exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_assessments_sector_id ON public.assessments(sector_id);
        CREATE INDEX IF NOT EXISTS idx_assessments_subsector_id ON public.assessments(subsector_id);
        CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at);
        CREATE INDEX IF NOT EXISTS idx_assessments_sector_created ON public.assessments(sector_id, created_at);
    END IF;
    
    -- Check if submissions exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_submissions_processed_by ON public.submissions(processed_by);
        CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON public.submissions(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_submissions_processed_by_created ON public.submissions(processed_by, created_at);
    END IF;
    
    -- Check if vulnerabilities exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerabilities' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_parent_id ON public.vulnerabilities(parent_id);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_sector_id ON public.vulnerabilities(sector_id);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_subsector_id ON public.vulnerabilities(subsector_id);
    END IF;
    
    -- Check if vulnerability_ofc_links exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerability_ofc_links' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_vulnerability_ofc_links_ofc_id ON public.vulnerability_ofc_links(ofc_id);
        CREATE INDEX IF NOT EXISTS idx_vulnerability_ofc_links_vulnerability_id ON public.vulnerability_ofc_links(vulnerability_id);
    END IF;
    
    -- Check if document_chunks exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
    END IF;
    
    -- Check if document_tags exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_tags' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON public.document_tags(document_id);
    END IF;
    
    -- Check if ofc_sources exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ofc_sources' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON public.ofc_sources(source_id);
    END IF;
    
END $$;

-- 3. Add primary keys to tables that need them (only if they exist)
DO $$
BEGIN
    -- Check if temp_vofc_import exists and add primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'temp_vofc_import' AND table_schema = 'public') THEN
        -- Check if it already has a primary key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE table_name = 'temp_vofc_import' 
                      AND constraint_type = 'PRIMARY KEY' 
                      AND table_schema = 'public') THEN
            ALTER TABLE public.temp_vofc_import ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
        END IF;
    END IF;
    
    -- Check if vulnerability_ofc_links exists and add composite primary key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerability_ofc_links' AND table_schema = 'public') THEN
        -- Check if it already has a primary key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE table_name = 'vulnerability_ofc_links' 
                      AND constraint_type = 'PRIMARY KEY' 
                      AND table_schema = 'public') THEN
            ALTER TABLE public.vulnerability_ofc_links ADD CONSTRAINT pk_vulnerability_ofc_links 
            PRIMARY KEY (vulnerability_id, ofc_id);
        END IF;
    END IF;
END $$;

-- 4. Remove unused indexes (only if they exist)
DO $$
BEGIN
    -- Remove unused indexes from public schema
    DROP INDEX IF EXISTS public.idx_disciplines_category;
    DROP INDEX IF EXISTS public.idx_disciplines_active;
    DROP INDEX IF EXISTS public.idx_user_permissions_user;
    DROP INDEX IF EXISTS public.idx_user_permissions_type;
    DROP INDEX IF EXISTS public.idx_submission_vulnerabilities_discipline;
    DROP INDEX IF EXISTS public.idx_submission_vulnerabilities_created_at;
    DROP INDEX IF EXISTS public.idx_submission_sources_reference_number;
    DROP INDEX IF EXISTS public.idx_user_profiles_role_idx;
    DROP INDEX IF EXISTS public.idx_user_profiles_active_idx;
    DROP INDEX IF EXISTS public.idx_rejected_submissions_submitter;
    DROP INDEX IF EXISTS public.idx_rejected_submissions_type;
    DROP INDEX IF EXISTS public.idx_rejected_submissions_rejected_at;
    DROP INDEX IF EXISTS public.idx_rejected_submissions_original_id;
    DROP INDEX IF EXISTS public.idx_subsectors_crosssector;
    DROP INDEX IF EXISTS public.idx_vofc_submissions_status;
    DROP INDEX IF EXISTS public.idx_vofc_submissions_uploaded_by;
    DROP INDEX IF EXISTS public.idx_vofc_submissions_created_at;
    DROP INDEX IF EXISTS public.idx_submission_ofc_sources_source_id;
    DROP INDEX IF EXISTS public.idx_ofc_requests_vulnerability_id;
    DROP INDEX IF EXISTS public.idx_ofc_requests_status;
    DROP INDEX IF EXISTS public.idx_ofc_requests_submitter;
    DROP INDEX IF EXISTS public.idx_ofc_requests_created_at;
    DROP INDEX IF EXISTS public.idx_user_groups_name;
    DROP INDEX IF EXISTS public.idx_user_groups_permissions;
    DROP INDEX IF EXISTS public.idx_user_profiles_user_id;
    DROP INDEX IF EXISTS public.idx_user_profiles_role;
END $$;

-- 5. Analyze tables to update statistics
ANALYZE public.user_profiles;
ANALYZE public.submissions;
ANALYZE public.assessments;
ANALYZE public.vulnerabilities;

-- 6. Show what indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
