-- Fix RLS policies for submissions table to allow anonymous submissions
-- This script enables submissions to be created by anonymous users

-- First, let's check if RLS is enabled and what policies exist
-- (This is for reference - we'll create new policies)

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "submissions_are_public" ON submissions;
DROP POLICY IF EXISTS "Allow anonymous submissions" ON submissions;
DROP POLICY IF EXISTS "Users can insert submissions" ON submissions;
DROP POLICY IF EXISTS "Admins can manage submissions" ON submissions;

-- Create a policy that allows anyone to insert submissions
-- This is appropriate for a public submission system
CREATE POLICY "Allow anonymous submissions" ON submissions
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read submissions (for transparency)
CREATE POLICY "submissions_are_public_read" ON submissions
  FOR SELECT USING (true);

-- Allow admins to update submissions (for approval/rejection workflow)
CREATE POLICY "Admins can update submissions" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.email LIKE '%@vofc.gov' OR auth.users.email LIKE '%@cisa.dhs.gov')
    )
  );

-- Allow admins to delete submissions if needed
CREATE POLICY "Admins can delete submissions" ON submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.email LIKE '%@vofc.gov' OR auth.users.email LIKE '%@cisa.dhs.gov')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions (type);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_submitter_email ON submissions (submitter_email);

-- Add a comment to document the purpose
COMMENT ON TABLE submissions IS 'Stores user submissions for vulnerabilities and options for consideration';
COMMENT ON COLUMN submissions.type IS 'Type of submission: vulnerability or ofc';
COMMENT ON COLUMN submissions.data IS 'JSON data containing the submission details';
COMMENT ON COLUMN submissions.status IS 'Status: pending_review, approved, rejected, needs_revision';
COMMENT ON COLUMN submissions.submitter_email IS 'Email of the person who submitted this entry';
