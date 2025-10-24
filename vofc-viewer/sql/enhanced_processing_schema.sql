-- Enhanced processing schema for improved batch processing and learning

-- Batch jobs table for parallel processing
CREATE TABLE IF NOT EXISTS batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed, partial_success
    total_files INTEGER NOT NULL,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    options JSONB, -- Processing options and configuration
    results JSONB, -- Detailed results from processing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Enhanced document processing with deduplication and confidence
CREATE TABLE IF NOT EXISTS document_processing_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA256 hash for deduplication
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    batch_id UUID REFERENCES batch_jobs(id),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    vulnerabilities_found INTEGER DEFAULT 0,
    ofcs_found INTEGER DEFAULT 0,
    processing_time INTEGER, -- milliseconds
    extraction_method TEXT, -- ollama, ollama_enhanced, basic, cached
    error_message TEXT,
    metadata JSONB, -- Additional processing metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing audit log for full traceability
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_processing_enhanced(id),
    batch_id UUID REFERENCES batch_jobs(id),
    event_type TEXT NOT NULL, -- file_uploaded, processing_started, ollama_called, processing_completed, error_occurred
    stage TEXT, -- upload, validation, extraction, analysis, learning
    message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    worker_id TEXT, -- For parallel processing tracking
    processing_time INTEGER -- milliseconds for this stage
);

-- Enhanced learning events with weighted scoring
CREATE TABLE IF NOT EXISTS learning_events_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    filename TEXT,
    vulnerabilities_found INTEGER,
    ofcs_found INTEGER,
    extraction_method TEXT,
    confidence_score DECIMAL(3,2),
    weighted_score DECIMAL(5,2), -- Calculated weighted score
    volume_factor DECIMAL(3,2), -- Based on content length
    recency_factor DECIMAL(3,2), -- Based on processing time
    quality_factor DECIMAL(3,2), -- Based on confidence and structure
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning feedback from human validation
CREATE TABLE IF NOT EXISTS learning_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_processing_enhanced(id),
    feedback_type TEXT NOT NULL, -- validation, correction, improvement
    user_id UUID REFERENCES auth.users(id),
    original_extraction JSONB,
    corrected_extraction JSONB,
    feedback_notes TEXT,
    confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heuristic pattern cache for recurring document types
CREATE TABLE IF NOT EXISTS heuristic_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name TEXT NOT NULL UNIQUE, -- e.g., 'SAFE_format', 'DHS_citation_layout'
    pattern_type TEXT NOT NULL, -- document_structure, citation_format, content_layout
    pattern_data JSONB NOT NULL, -- Stored pattern recognition data
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SAFE/IST integration tables
CREATE TABLE IF NOT EXISTS safe_vofc_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    discipline TEXT,
    sector TEXT,
    subsector TEXT,
    source_document TEXT,
    page_number INTEGER,
    confidence_score DECIMAL(3,2),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS ist_vofc_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    discipline TEXT,
    sector TEXT,
    subsector TEXT,
    source_document TEXT,
    page_number INTEGER,
    confidence_score DECIMAL(3,2),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Source linking for verified VOFC entries
CREATE TABLE IF NOT EXISTS verified_vofc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id),
    safe_reference_id UUID REFERENCES safe_vofc_library(id),
    ist_reference_id UUID REFERENCES ist_vofc_library(id),
    link_type TEXT NOT NULL, -- direct_match, similar_content, related_discipline
    confidence_score DECIMAL(3,2),
    verification_status TEXT DEFAULT 'pending', -- pending, verified, rejected
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced learning statistics
CREATE TABLE IF NOT EXISTS learning_stats_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL UNIQUE,
    metric_value JSONB,
    weighted_score DECIMAL(5,2),
    trend_direction TEXT, -- improving, declining, stable
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    historical_data JSONB -- Store historical trends
);

-- Processing audit view for full traceability
CREATE OR REPLACE VIEW processing_audit AS
SELECT 
    dp.id as document_id,
    dp.filename,
    dp.file_hash,
    dp.status,
    dp.confidence_score,
    dp.vulnerabilities_found,
    dp.ofcs_found,
    dp.processing_time,
    dp.extraction_method,
    bj.id as batch_id,
    bj.status as batch_status,
    bj.priority as batch_priority,
    pl.event_type,
    pl.stage,
    pl.message,
    pl.timestamp as event_timestamp,
    pl.worker_id,
    pl.processing_time as stage_time,
    lf.feedback_type,
    lf.confidence_rating,
    dp.created_at,
    dp.updated_at
FROM document_processing_enhanced dp
LEFT JOIN batch_jobs bj ON dp.batch_id = bj.id
LEFT JOIN processing_logs pl ON dp.id = pl.document_id
LEFT JOIN learning_feedback lf ON dp.id = lf.document_id
ORDER BY dp.created_at DESC, pl.timestamp DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_priority ON batch_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_document_processing_hash ON document_processing_enhanced(file_hash);
CREATE INDEX IF NOT EXISTS idx_document_processing_status ON document_processing_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_document_processing_confidence ON document_processing_enhanced(confidence_score);
CREATE INDEX IF NOT EXISTS idx_processing_logs_document ON processing_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_batch ON processing_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_weighted ON learning_events_enhanced(weighted_score);
CREATE INDEX IF NOT EXISTS idx_heuristic_patterns_usage ON heuristic_patterns(usage_count);
CREATE INDEX IF NOT EXISTS idx_safe_vofc_reference ON safe_vofc_library(reference_number);
CREATE INDEX IF NOT EXISTS idx_ist_vofc_reference ON ist_vofc_library(reference_number);

-- Row Level Security (RLS) policies
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE heuristic_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_vofc_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ist_vofc_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_vofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_stats_enhanced ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow authenticated read access to batch_jobs"
ON batch_jobs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to document_processing_enhanced"
ON document_processing_enhanced FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to processing_logs"
ON processing_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_events_enhanced"
ON learning_events_enhanced FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_feedback"
ON learning_feedback FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to heuristic_patterns"
ON heuristic_patterns FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to safe_vofc_library"
ON safe_vofc_library FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to ist_vofc_library"
ON ist_vofc_library FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to verified_vofc_links"
ON verified_vofc_links FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_stats_enhanced"
ON learning_stats_enhanced FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role policies for full access
CREATE POLICY "Allow service role full access to batch_jobs"
ON batch_jobs FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to document_processing_enhanced"
ON document_processing_enhanced FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to processing_logs"
ON processing_logs FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_events_enhanced"
ON learning_events_enhanced FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_feedback"
ON learning_feedback FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to heuristic_patterns"
ON heuristic_patterns FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to safe_vofc_library"
ON safe_vofc_library FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to ist_vofc_library"
ON ist_vofc_library FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to verified_vofc_links"
ON verified_vofc_links FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_stats_enhanced"
ON learning_stats_enhanced FOR ALL
USING (auth.role() = 'service_role');
