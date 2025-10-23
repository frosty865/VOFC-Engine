-- Create OFC Requests table for tracking OFC submissions
CREATE TABLE IF NOT EXISTS ofc_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vulnerability_id UUID NOT NULL,
    ofc_text TEXT NOT NULL,
    submitter VARCHAR(255) NOT NULL,
    vulnerability_text TEXT,
    discipline VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'implemented')),
    supervisor_notes TEXT,
    approved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ofc_requests_vulnerability_id ON ofc_requests(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_ofc_requests_status ON ofc_requests(status);
CREATE INDEX IF NOT EXISTS idx_ofc_requests_submitter ON ofc_requests(submitter);
CREATE INDEX IF NOT EXISTS idx_ofc_requests_created_at ON ofc_requests(created_at);

-- Add RLS policies
ALTER TABLE ofc_requests ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own requests
CREATE POLICY "Users can view their own OFC requests" ON ofc_requests
    FOR SELECT USING (auth.uid()::text = submitter);

-- Policy for authenticated users to insert OFC requests
CREATE POLICY "Users can create OFC requests" ON ofc_requests
    FOR INSERT WITH CHECK (auth.uid()::text = submitter);

-- Policy for supervisors to view all requests
CREATE POLICY "Supervisors can view all OFC requests" ON ofc_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('supervisor', 'admin')
        )
    );

-- Policy for supervisors to update OFC requests
CREATE POLICY "Supervisors can update OFC requests" ON ofc_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('supervisor', 'admin')
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ofc_requests_updated_at 
    BEFORE UPDATE ON ofc_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
