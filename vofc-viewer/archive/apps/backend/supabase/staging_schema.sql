-- Staging table for VOFC submissions before approval
CREATE TABLE IF NOT EXISTS vofc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision')),
  data JSONB NOT NULL,
  uploaded_by TEXT NOT NULL,
  approved_by TEXT,
  rejected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submission_metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vofc_submissions_status ON vofc_submissions (status);
CREATE INDEX IF NOT EXISTS idx_vofc_submissions_uploaded_by ON vofc_submissions (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_vofc_submissions_created_at ON vofc_submissions (created_at);

-- RLS policies for staging table
ALTER TABLE vofc_submissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own submissions
CREATE POLICY "Users can view their own submissions" ON vofc_submissions
  FOR SELECT USING (auth.uid()::text = uploaded_by);

-- Allow admins to view all submissions
CREATE POLICY "Admins can view all submissions" ON vofc_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@vofc.gov'
    )
  );

-- Allow users to insert their own submissions
CREATE POLICY "Users can insert their own submissions" ON vofc_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);

-- Allow admins to update submissions (approve/reject)
CREATE POLICY "Admins can update submissions" ON vofc_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@vofc.gov'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_vofc_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_vofc_submissions_updated_at
  BEFORE UPDATE ON vofc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_vofc_submissions_updated_at();
