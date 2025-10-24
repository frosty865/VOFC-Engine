-- Create learning_events table for continuous learning system
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'document_processed', 'user_feedback', 'pattern_discovered', etc.
    filename TEXT,
    vulnerabilities_found INTEGER DEFAULT 0,
    ofcs_found INTEGER DEFAULT 0,
    extraction_method TEXT, -- 'ollama', 'basic', 'manual'
    confidence TEXT, -- 'high', 'medium', 'low'
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB, -- Store the actual extracted data for learning
    learning_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_processed ON learning_events(learning_processed);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);

-- Enable RLS
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to learning_events"
ON learning_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read learning events
CREATE POLICY "Allow authenticated read access to learning_events"
ON learning_events FOR SELECT
USING (auth.role() = 'authenticated');

-- Create learning_stats table to track learning system performance
CREATE TABLE IF NOT EXISTS learning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_type TEXT NOT NULL, -- 'learning_cycle', 'pattern_discovery', 'model_update'
    total_events_processed INTEGER DEFAULT 0,
    successful_retrains INTEGER DEFAULT 0,
    failed_retrains INTEGER DEFAULT 0,
    rules_generated INTEGER DEFAULT 0,
    embeddings_updated INTEGER DEFAULT 0,
    last_learning_run TIMESTAMP WITH TIME ZONE,
    system_health TEXT DEFAULT 'healthy', -- 'healthy', 'degraded', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for learning_stats
ALTER TABLE learning_stats ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to learning_stats
CREATE POLICY "Allow service role full access to learning_stats"
ON learning_stats FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read learning stats
CREATE POLICY "Allow authenticated read access to learning_stats"
ON learning_stats FOR SELECT
USING (auth.role() = 'authenticated');
