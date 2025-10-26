-- Database Performance Optimization Script
-- Based on Supabase linter recommendations

-- 1. Add missing indexes for foreign keys
-- These will improve query performance for joins and foreign key lookups

-- Assessment-related tables
CREATE INDEX IF NOT EXISTS idx_assessment_metrics_assessment_id ON public.assessment_metrics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_ofcs_assessment_id ON public.assessment_ofcs(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_ofcs_ofc_id ON public.assessment_ofcs(ofc_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON public.assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON public.assessment_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_vulns_assessment_id ON public.assessment_vulns(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_vulns_vulnerability_id ON public.assessment_vulns(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_assessments_sector_id ON public.assessments(sector_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subsector_id ON public.assessments(subsector_id);

-- Document-related tables
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON public.document_tags(document_id);

-- OFC-related tables
CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON public.ofc_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_submissions_processed_by ON public.submissions(processed_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON public.user_profiles(created_by);

-- Vulnerability-related tables
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_parent_id ON public.vulnerabilities(parent_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_sector_id ON public.vulnerabilities(sector_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_subsector_id ON public.vulnerabilities(subsector_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_ofc_links_ofc_id ON public.vulnerability_ofc_links(ofc_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_ofc_links_vulnerability_id ON public.vulnerability_ofc_links(vulnerability_id);

-- VOFC schema tables
CREATE INDEX IF NOT EXISTS idx_ofcs_batch_id ON vofc.ofcs(batch_id);
CREATE INDEX IF NOT EXISTS idx_question_ofc_map_batch_id ON vofc.question_ofc_map(batch_id);
CREATE INDEX IF NOT EXISTS idx_question_ofc_map_question_pk ON vofc.question_ofc_map(question_pk);
CREATE INDEX IF NOT EXISTS idx_questions_batch_id ON vofc.questions(batch_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_batch_id ON vofc.vulnerabilities(batch_id);

-- 2. Add primary keys to tables missing them
-- This improves performance and ensures data integrity

-- Add primary key to temp_vofc_import (if it needs one)
-- Note: This is a temporary table, so we'll add a simple serial primary key
ALTER TABLE public.temp_vofc_import ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;

-- Add composite primary key to vulnerability_ofc_links
-- This table links vulnerabilities to OFCs, so we need a composite key
ALTER TABLE public.vulnerability_ofc_links ADD CONSTRAINT pk_vulnerability_ofc_links 
PRIMARY KEY (vulnerability_id, ofc_id);

-- 3. Remove unused indexes to improve performance
-- These indexes are not being used and consume storage and maintenance overhead

-- Remove unused indexes from VOFC schema
DROP INDEX IF EXISTS vofc.idx_questions_ref;
DROP INDEX IF EXISTS vofc.idx_ofcs_ref;
DROP INDEX IF EXISTS vofc.idx_vulns_ref;
DROP INDEX IF EXISTS vofc.idx_links_ref;

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

-- 4. Add useful indexes for common queries
-- These will improve performance for frequently used queries

-- User and authentication related
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON public.user_profiles(organization);

-- Document processing related
CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON public.submissions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_processed_by_created ON public.submissions(processed_by, created_at);

-- Assessment related
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_assessments_sector_created ON public.assessments(sector_id, created_at);

-- 5. Analyze tables to update statistics
-- This helps the query planner make better decisions
ANALYZE public.user_profiles;
ANALYZE public.assessments;
ANALYZE public.submissions;
ANALYZE public.vulnerabilities;
ANALYZE public.ofcs;
ANALYZE vofc.ofcs;
ANALYZE vofc.questions;
ANALYZE vofc.vulnerabilities;

-- 6. Verify the optimizations
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname IN ('public', 'vofc')
AND indexname LIKE 'idx_%'
ORDER BY schemaname, tablename, indexname;
