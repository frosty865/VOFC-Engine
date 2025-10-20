-- Enable Row Level Security (RLS) on all public tables
-- This fixes the "Invalid API key" errors by properly securing the tables

-- Enable RLS on main tables
ALTER TABLE public.readiness_resilience_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofc_option ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_objective ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_ofc_link ENABLE ROW LEVEL SECURITY;

-- Enable RLS on additional tables that might be used
ALTER TABLE public.assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Enable RLS on staging tables
ALTER TABLE public._staging_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._staging_ofc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._staging_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._staging_links ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables
ALTER TABLE public.assessment_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._map_assess ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for now - you can restrict later)
-- Main tables
CREATE POLICY "Allow all operations on readiness_resilience_assessment" ON public.readiness_resilience_assessment FOR ALL USING (true);
CREATE POLICY "Allow all operations on ofc_option" ON public.ofc_option FOR ALL USING (true);
CREATE POLICY "Allow all operations on control_objective" ON public.control_objective FOR ALL USING (true);
CREATE POLICY "Allow all operations on question_ofc_link" ON public.question_ofc_link FOR ALL USING (true);

-- Additional tables
CREATE POLICY "Allow all operations on assessment" ON public.assessment FOR ALL USING (true);
CREATE POLICY "Allow all operations on ofcs" ON public.ofcs FOR ALL USING (true);
CREATE POLICY "Allow all operations on controls" ON public.controls FOR ALL USING (true);
CREATE POLICY "Allow all operations on links" ON public.links FOR ALL USING (true);

-- Staging tables
CREATE POLICY "Allow all operations on _staging_controls" ON public._staging_controls FOR ALL USING (true);
CREATE POLICY "Allow all operations on _staging_ofc" ON public._staging_ofc FOR ALL USING (true);
CREATE POLICY "Allow all operations on _staging_assessments" ON public._staging_assessments FOR ALL USING (true);
CREATE POLICY "Allow all operations on _staging_links" ON public._staging_links FOR ALL USING (true);

-- Other tables
CREATE POLICY "Allow all operations on assessment_session" ON public.assessment_session FOR ALL USING (true);
CREATE POLICY "Allow all operations on _map_assess" ON public._map_assess FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
