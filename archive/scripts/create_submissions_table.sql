-- Create submissions table for API submissions
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('vulnerability', 'ofc')),
    data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'processed')),
    source VARCHAR(50) DEFAULT 'api_submission',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS submissions_type_idx ON public.submissions(type);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON public.submissions(created_at);
CREATE INDEX IF NOT EXISTS submissions_source_idx ON public.submissions(source);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read submissions
CREATE POLICY "Allow authenticated users to read submissions" ON public.submissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert submissions
CREATE POLICY "Allow authenticated users to insert submissions" ON public.submissions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow admin users to update submissions
CREATE POLICY "Allow admin users to update submissions" ON public.submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa', 'analyst')
        )
    );

-- Allow admin users to delete submissions
CREATE POLICY "Allow admin users to delete submissions" ON public.submissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'spsa', 'analyst')
        )
    );


