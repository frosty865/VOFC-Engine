-- Enhanced learning system schema with confidence scoring and feedback
-- This extends the existing enhanced_processing_schema.sql

-- Confidence analysis table for detailed scoring
CREATE TABLE IF NOT EXISTS confidence_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_processing_enhanced(id),
    overall_confidence DECIMAL(3,2) NOT NULL CHECK (overall_confidence >= 0.0 AND overall_confidence <= 1.0),
    ocr_clarity DECIMAL(3,2) NOT NULL CHECK (ocr_clarity >= 0.0 AND ocr_clarity <= 1.0),
    text_length_factor DECIMAL(3,2) NOT NULL CHECK (text_length_factor >= 0.0 AND text_length_factor <= 1.0),
    citation_density DECIMAL(3,2) NOT NULL CHECK (citation_density >= 0.0 AND citation_density <= 1.0),
    structure_quality DECIMAL(3,2) NOT NULL CHECK (structure_quality >= 0.0 AND structure_quality <= 1.0),
    content_completeness DECIMAL(3,2) NOT NULL CHECK (content_completeness >= 0.0 AND content_completeness <= 1.0),
    extraction_quality DECIMAL(3,2) NOT NULL CHECK (extraction_quality >= 0.0 AND extraction_quality <= 1.0),
    factors JSONB, -- Detailed factor breakdown
    recommendations JSONB, -- Generated recommendations
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning model updates tracking
CREATE TABLE IF NOT EXISTS learning_model_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_processing_enhanced(id),
    feedback_id UUID REFERENCES learning_feedback(id),
    model_version TEXT NOT NULL,
    update_type TEXT NOT NULL, -- 'feedback_triggered', 'scheduled', 'manual'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    feedback_ids UUID[], -- Array of feedback IDs used in update
    update_data JSONB, -- Model update parameters and results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Security validations table for enhanced security tracking
CREATE TABLE IF NOT EXISTS security_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    is_safe BOOLEAN NOT NULL,
    risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    checksum TEXT NOT NULL, -- SHA256 hash
    mime_type TEXT,
    file_size BIGINT,
    issues TEXT[], -- Array of security issues found
    metadata JSONB, -- Detailed security analysis
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch job progress tracking for streaming updates
CREATE TABLE IF NOT EXISTS batch_job_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batch_jobs(id),
    worker_id TEXT,
    filename TEXT,
    status TEXT NOT NULL, -- 'started', 'processing', 'completed', 'failed'
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_stage TEXT, -- 'upload', 'validation', 'extraction', 'analysis', 'learning'
    processing_time INTEGER, -- milliseconds
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning insights and recommendations
CREATE TABLE IF NOT EXISTS learning_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL, -- 'feedback_quality', 'learning_effectiveness', 'pattern_effectiveness'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    recommendation TEXT,
    insight_data JSONB, -- Detailed insight analysis
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced learning statistics with historical data
CREATE TABLE IF NOT EXISTS learning_statistics_historical (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    weighted_score DECIMAL(5,2),
    trend_direction TEXT, -- 'improving', 'declining', 'stable'
    historical_data JSONB, -- Store historical trends
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document processing audit view (enhanced)
CREATE OR REPLACE VIEW processing_audit_enhanced AS
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
    lf.impact_score,
    ca.overall_confidence as detailed_confidence,
    ca.ocr_clarity,
    ca.citation_density,
    ca.structure_quality,
    ca.content_completeness,
    ca.extraction_quality,
    sv.is_safe as security_validated,
    sv.risk_level as security_risk_level,
    dp.created_at,
    dp.updated_at
FROM document_processing_enhanced dp
LEFT JOIN batch_jobs bj ON dp.batch_id = bj.id
LEFT JOIN processing_logs pl ON dp.id = pl.document_id
LEFT JOIN learning_feedback lf ON dp.id = lf.document_id
LEFT JOIN confidence_analyses ca ON dp.id = ca.document_id
LEFT JOIN security_validations sv ON dp.filename = sv.filename
ORDER BY dp.created_at DESC, pl.timestamp DESC;

-- Learning effectiveness view
CREATE OR REPLACE VIEW learning_effectiveness AS
SELECT 
    DATE(le.processed_at) as processing_date,
    COUNT(*) as total_events,
    AVG(le.confidence_score) as avg_confidence,
    AVG(le.weighted_score) as avg_weighted_score,
    COUNT(CASE WHEN le.confidence_score > 0.8 THEN 1 END) as high_confidence_count,
    COUNT(CASE WHEN le.weighted_score > 0.7 THEN 1 END) as high_weighted_count,
    AVG(le.vulnerabilities_found) as avg_vulnerabilities,
    AVG(le.ofcs_found) as avg_ofcs,
    COUNT(DISTINCT le.extraction_method) as extraction_methods_used
FROM learning_events_enhanced le
WHERE le.processed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(le.processed_at)
ORDER BY processing_date DESC;

-- Pattern effectiveness view
CREATE OR REPLACE VIEW pattern_effectiveness AS
SELECT 
    hp.pattern_name,
    hp.pattern_type,
    hp.usage_count,
    hp.success_rate,
    hp.last_used,
    COUNT(DISTINCT dp.id) as documents_processed,
    AVG(dp.confidence_score) as avg_confidence,
    AVG(dp.processing_time) as avg_processing_time
FROM heuristic_patterns hp
LEFT JOIN document_processing_enhanced dp ON dp.extraction_method LIKE '%' || hp.pattern_name || '%'
WHERE hp.usage_count > 0
GROUP BY hp.id, hp.pattern_name, hp.pattern_type, hp.usage_count, hp.success_rate, hp.last_used
ORDER BY hp.success_rate DESC, hp.usage_count DESC;

-- Feedback impact analysis view
CREATE OR REPLACE VIEW feedback_impact_analysis AS
SELECT 
    lf.feedback_type,
    COUNT(*) as feedback_count,
    AVG(lf.impact_score) as avg_impact_score,
    COUNT(CASE WHEN lf.impact_score > 0.7 THEN 1 END) as high_impact_count,
    AVG(lf.confidence_rating) as avg_confidence_rating,
    COUNT(DISTINCT lf.document_id) as documents_affected,
    DATE(lf.created_at) as feedback_date
FROM learning_feedback lf
WHERE lf.created_at >= NOW() - INTERVAL '30 days'
GROUP BY lf.feedback_type, DATE(lf.created_at)
ORDER BY feedback_date DESC, avg_impact_score DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_confidence_analyses_document ON confidence_analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_confidence_analyses_overall ON confidence_analyses(overall_confidence);
CREATE INDEX IF NOT EXISTS idx_learning_model_updates_status ON learning_model_updates(status);
CREATE INDEX IF NOT EXISTS idx_learning_model_updates_version ON learning_model_updates(model_version);
CREATE INDEX IF NOT EXISTS idx_security_validations_safe ON security_validations(is_safe);
CREATE INDEX IF NOT EXISTS idx_security_validations_risk ON security_validations(risk_level);
CREATE INDEX IF NOT EXISTS idx_batch_job_progress_batch ON batch_job_progress(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_job_progress_status ON batch_job_progress(status);
CREATE INDEX IF NOT EXISTS idx_learning_insights_type ON learning_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_learning_insights_priority ON learning_insights(priority);
CREATE INDEX IF NOT EXISTS idx_learning_statistics_historical_metric ON learning_statistics_historical(metric_name);
CREATE INDEX IF NOT EXISTS idx_learning_statistics_historical_period ON learning_statistics_historical(period_start, period_end);

-- Row Level Security (RLS) policies
ALTER TABLE confidence_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_model_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_statistics_historical ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow authenticated read access to confidence_analyses"
ON confidence_analyses FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_model_updates"
ON learning_model_updates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to security_validations"
ON security_validations FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to batch_job_progress"
ON batch_job_progress FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_insights"
ON learning_insights FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to learning_statistics_historical"
ON learning_statistics_historical FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role policies for full access
CREATE POLICY "Allow service role full access to confidence_analyses"
ON confidence_analyses FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_model_updates"
ON learning_model_updates FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to security_validations"
ON security_validations FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to batch_job_progress"
ON batch_job_progress FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_insights"
ON learning_insights FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to learning_statistics_historical"
ON learning_statistics_historical FOR ALL
USING (auth.role() = 'service_role');

-- Functions for automated learning triggers
CREATE OR REPLACE FUNCTION trigger_learning_cycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if we have enough high-quality events to trigger learning
    IF (SELECT COUNT(*) FROM learning_events_enhanced 
        WHERE processed_at >= NOW() - INTERVAL '24 hours' 
        AND weighted_score > 0.7) >= 5 THEN
        
        -- Insert learning trigger event
        INSERT INTO learning_stats_enhanced (metric_name, metric_value, last_updated)
        VALUES ('learning_cycle_triggered', 
                jsonb_build_object('triggered_at', NOW(), 'event_count', 
                    (SELECT COUNT(*) FROM learning_events_enhanced 
                     WHERE processed_at >= NOW() - INTERVAL '24 hours')), 
                NOW())
        ON CONFLICT (metric_name) DO UPDATE SET
            metric_value = EXCLUDED.metric_value,
            last_updated = EXCLUDED.last_updated;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automated learning cycles
CREATE TRIGGER trigger_learning_cycle_trigger
    AFTER INSERT ON learning_events_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION trigger_learning_cycle();

-- Function for confidence score updates
CREATE OR REPLACE FUNCTION update_confidence_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update document processing confidence
    UPDATE document_processing_enhanced 
    SET confidence_score = NEW.overall_confidence,
        updated_at = NOW()
    WHERE id = NEW.document_id;
    
    -- Update learning statistics
    INSERT INTO learning_statistics_historical (metric_name, metric_value, weighted_score, period_start, period_end)
    VALUES ('confidence_analysis', 
            jsonb_build_object('overall_confidence', NEW.overall_confidence,
                              'ocr_clarity', NEW.ocr_clarity,
                              'citation_density', NEW.citation_density),
            NEW.overall_confidence,
            DATE_TRUNC('day', NOW()),
            DATE_TRUNC('day', NOW()) + INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for confidence score updates
CREATE TRIGGER update_confidence_statistics_trigger
    AFTER INSERT ON confidence_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_confidence_statistics();
