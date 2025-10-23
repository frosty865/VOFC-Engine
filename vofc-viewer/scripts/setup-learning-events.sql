-- Create learning_events table for continuous learning
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    submission_id UUID REFERENCES submissions(id),
    source_id VARCHAR(255),
    target_id VARCHAR(255),
    confidence DECIMAL(3,2) DEFAULT 0.0,
    approved BOOLEAN DEFAULT false,
    processed_by VARCHAR(255),
    comments TEXT,
    sector VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_approved ON learning_events(approved);
CREATE INDEX IF NOT EXISTS idx_learning_events_confidence ON learning_events(confidence);

-- Add RLS policies
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role can manage learning events" ON learning_events
    FOR ALL USING (true);

-- Policy for authenticated users (read only)
CREATE POLICY "Authenticated users can read learning events" ON learning_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample learning events for testing
INSERT INTO learning_events (event_type, confidence, approved, comments, sector) VALUES
('submission_approved', 1.0, true, 'High-quality security guidance document', 'Energy'),
('submission_rejected', 0.8, false, 'Document lacked sufficient detail', 'Healthcare'),
('link_approved', 0.9, true, 'Strong correlation between vulnerability and OFC', 'Transportation'),
('vulnerability_processed', 0.95, true, 'Successfully extracted vulnerability data', 'Financial');

-- Create a view for learning statistics
CREATE OR REPLACE VIEW learning_statistics AS
SELECT 
    event_type,
    COUNT(*) as total_events,
    AVG(confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE approved = true) as approved_events,
    COUNT(*) FILTER (WHERE approved = false) as rejected_events,
    MAX(created_at) as last_event
FROM learning_events
GROUP BY event_type
ORDER BY total_events DESC;
