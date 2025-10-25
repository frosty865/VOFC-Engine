-- SIMPLE RLS FIX - DIRECT APPROACH
-- This script uses the most basic RLS approach to ensure it works

-- Step 1: Enable RLS on all tables
ALTER TABLE public.options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_ofcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_vulns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofc_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_ofc_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vofc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejected_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_vofc_import ENABLE ROW LEVEL SECURITY;

-- Step 2: Create the simplest possible policy - block everything by default
CREATE POLICY "block_all_access" ON public.options_for_consideration
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.vulnerabilities
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.sources
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.vulnerability_ofc_links
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.user_profiles
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.user_groups
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.user_permissions
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessments
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessment_metrics
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessment_ofcs
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessment_questions
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessment_responses
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.assessment_vulns
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.documents
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.document_chunks
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.document_tags
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.knowledge_embeddings
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.sectors
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.subsectors
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.ofc_requests
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.ofc_sources
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.disciplines
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submissions
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submission_vulnerabilities
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submission_options_for_consideration
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submission_sources
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submission_vulnerability_ofc_links
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.submission_ofc_sources
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.vofc_submissions
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.rejected_submissions
    FOR ALL USING (false);

CREATE POLICY "block_all_access" ON public.temp_vofc_import
    FOR ALL USING (false);

-- Step 3: Revoke all permissions from anonymous
REVOKE ALL ON public.options_for_consideration FROM anon;
REVOKE ALL ON public.vulnerabilities FROM anon;
REVOKE ALL ON public.sources FROM anon;
REVOKE ALL ON public.vulnerability_ofc_links FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_groups FROM anon;
REVOKE ALL ON public.user_permissions FROM anon;
REVOKE ALL ON public.assessments FROM anon;
REVOKE ALL ON public.assessment_metrics FROM anon;
REVOKE ALL ON public.assessment_ofcs FROM anon;
REVOKE ALL ON public.assessment_questions FROM anon;
REVOKE ALL ON public.assessment_responses FROM anon;
REVOKE ALL ON public.assessment_vulns FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.document_chunks FROM anon;
REVOKE ALL ON public.document_tags FROM anon;
REVOKE ALL ON public.knowledge_embeddings FROM anon;
REVOKE ALL ON public.sectors FROM anon;
REVOKE ALL ON public.subsectors FROM anon;
REVOKE ALL ON public.ofc_requests FROM anon;
REVOKE ALL ON public.ofc_sources FROM anon;
REVOKE ALL ON public.disciplines FROM anon;
REVOKE ALL ON public.submissions FROM anon;
REVOKE ALL ON public.submission_vulnerabilities FROM anon;
REVOKE ALL ON public.submission_options_for_consideration FROM anon;
REVOKE ALL ON public.submission_sources FROM anon;
REVOKE ALL ON public.submission_vulnerability_ofc_links FROM anon;
REVOKE ALL ON public.submission_ofc_sources FROM anon;
REVOKE ALL ON public.vofc_submissions FROM anon;
REVOKE ALL ON public.rejected_submissions FROM anon;
REVOKE ALL ON public.temp_vofc_import FROM anon;
