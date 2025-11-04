-- Migration: Add rejection-related columns to submissions table
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- reviewed_at: Timestamp when submission was reviewed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN reviewed_at timestamptz;
  END IF;

  -- reviewed_by: User ID who reviewed the submission
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE submissions ADD COLUMN reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- rejection_reason: Reason for rejection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE submissions ADD COLUMN rejection_reason text;
  END IF;

  -- review_comments: General comments from reviewer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'review_comments'
  ) THEN
    ALTER TABLE submissions ADD COLUMN review_comments text;
  END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_at ON submissions(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Grant necessary permissions (if needed)
-- GRANT SELECT, INSERT, UPDATE ON submissions TO authenticated;
-- GRANT ALL ON submissions TO service_role;

