-- Rejected Submissions Schema
-- This table stores submissions that have been rejected and returned to users

CREATE TABLE IF NOT EXISTS rejected_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_submission_id UUID NOT NULL,
    submitter_email TEXT NOT NULL,
    submitter_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('vulnerability', 'ofc')),
    data JSONB NOT NULL,
    rejection_reason TEXT,
    rejected_by UUID,
    rejected_at TIMESTAMPTZ DEFAULT NOW(),
    resubmitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rejected_submissions_submitter ON rejected_submissions(submitter_email);
CREATE INDEX IF NOT EXISTS idx_rejected_submissions_type ON rejected_submissions(type);
CREATE INDEX IF NOT EXISTS idx_rejected_submissions_rejected_at ON rejected_submissions(rejected_at);
CREATE INDEX IF NOT EXISTS idx_rejected_submissions_original_id ON rejected_submissions(original_submission_id);

-- RLS policies
ALTER TABLE rejected_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own rejected submissions
CREATE POLICY "Users can view their own rejected submissions" ON rejected_submissions 
FOR SELECT USING (submitter_email = auth.jwt() ->> 'email');

-- Admins can view all rejected submissions
CREATE POLICY "Admins can view all rejected submissions" ON rejected_submissions 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id::text = auth.uid()::text 
        AND role IN ('admin', 'spsa')
    )
);

-- Function to move rejected submission to rejected_submissions table
CREATE OR REPLACE FUNCTION move_to_rejected_submissions(
    p_submission_id UUID,
    p_rejection_reason TEXT,
    p_rejected_by UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_submission RECORD;
BEGIN
    -- Get the submission data
    SELECT * INTO v_submission 
    FROM submissions 
    WHERE id = p_submission_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false as success,
            'Submission not found' as message;
        RETURN;
    END IF;
    
    -- Insert into rejected_submissions table
    INSERT INTO rejected_submissions (
        original_submission_id,
        submitter_email,
        submitter_name,
        type,
        data,
        rejection_reason,
        rejected_by
    ) VALUES (
        v_submission.id,
        v_submission.submitter_email,
        v_submission.submitter_name,
        v_submission.type,
        v_submission.data,
        p_rejection_reason,
        p_rejected_by
    );
    
    -- Delete from submissions table
    DELETE FROM submissions WHERE id = p_submission_id;
    
    RETURN QUERY SELECT 
        true as success,
        'Submission moved to rejected submissions' as message;
        
END;
$$ LANGUAGE plpgsql;

-- Function to resubmit a rejected submission
CREATE OR REPLACE FUNCTION resubmit_rejected_submission(
    p_rejected_submission_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_submission_id UUID
) AS $$
DECLARE
    v_rejected RECORD;
    v_new_submission_id UUID;
BEGIN
    -- Get the rejected submission data
    SELECT * INTO v_rejected 
    FROM rejected_submissions 
    WHERE id = p_rejected_submission_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false as success,
            'Rejected submission not found' as message,
            NULL::UUID as new_submission_id;
        RETURN;
    END IF;
    
    -- Create new submission in submissions table
    INSERT INTO submissions (
        submitter_email,
        submitter_name,
        type,
        data,
        status,
        source
    ) VALUES (
        v_rejected.submitter_email,
        v_rejected.submitter_name,
        v_rejected.type,
        v_rejected.data,
        'pending_review',
        'resubmitted'
    ) RETURNING id INTO v_new_submission_id;
    
    -- Update rejected submission with resubmitted timestamp
    UPDATE rejected_submissions 
    SET resubmitted_at = NOW() 
    WHERE id = p_rejected_submission_id;
    
    RETURN QUERY SELECT 
        true as success,
        'Submission resubmitted successfully' as message,
        v_new_submission_id as new_submission_id;
        
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION move_to_rejected_submissions TO authenticated;
GRANT EXECUTE ON FUNCTION resubmit_rejected_submission TO authenticated;
