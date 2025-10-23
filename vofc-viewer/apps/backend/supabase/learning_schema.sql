-- Learning Events and Vector Store Schema for VOFC Engine
-- This schema supports the self-improving capabilities

-- Learning events table for tracking all interactions
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    source_id UUID,
    target_id UUID,
    confidence NUMERIC,
    approved BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings for vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerability_embeddings (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    sector TEXT,
    subsector TEXT,
    embedding VECTOR(4096), -- Adjust dimension based on your model
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings for OFCs
CREATE TABLE IF NOT EXISTS ofc_embeddings (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    vulnerability_id UUID,
    embedding VECTOR(4096),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Similarity cache for performance
CREATE TABLE IF NOT EXISTS similarity_cache (
    source_id UUID,
    target_id UUID,
    similarity NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (source_id, target_id)
);

-- Review queue for human-in-the-loop
CREATE TABLE IF NOT EXISTS review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    confidence NUMERIC NOT NULL,
    link_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending_review',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerability links with confidence scoring
CREATE TABLE IF NOT EXISTS vulnerability_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    confidence NUMERIC NOT NULL,
    link_type TEXT NOT NULL,
    status TEXT DEFAULT 'auto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OFC links with confidence scoring
CREATE TABLE IF NOT EXISTS ofc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    confidence NUMERIC NOT NULL,
    link_type TEXT NOT NULL,
    status TEXT DEFAULT 'auto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sector-specific profiles for weighting
CREATE TABLE IF NOT EXISTS sector_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector TEXT NOT NULL UNIQUE,
    keywords JSONB,
    weights JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern learning rules
CREATE TABLE IF NOT EXISTS pattern_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL,
    pattern_text TEXT NOT NULL,
    correction TEXT NOT NULL,
    confidence NUMERIC,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_similarity ON similarity_cache(similarity);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_links_confidence ON vulnerability_links(confidence);
CREATE INDEX IF NOT EXISTS idx_ofc_links_confidence ON ofc_links(confidence);

-- Functions for similarity search
CREATE OR REPLACE FUNCTION find_similar_vulnerabilities(
    query_embedding VECTOR(4096),
    match_threshold NUMERIC DEFAULT 0.7,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    sector TEXT,
    subsector TEXT,
    similarity NUMERIC
)
LANGUAGE SQL
AS $$
    SELECT 
        ve.id,
        ve.text,
        ve.sector,
        ve.subsector,
        1 - (ve.embedding <=> query_embedding) AS similarity
    FROM vulnerability_embeddings ve
    WHERE 1 - (ve.embedding <=> query_embedding) > match_threshold
    ORDER BY ve.embedding <=> query_embedding
    LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION find_similar_ofcs(
    query_embedding VECTOR(4096),
    match_threshold NUMERIC DEFAULT 0.7,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    vulnerability_id UUID,
    similarity NUMERIC
)
LANGUAGE SQL
AS $$
    SELECT 
        oe.id,
        oe.text,
        oe.vulnerability_id,
        1 - (oe.embedding <=> query_embedding) AS similarity
    FROM ofc_embeddings oe
    WHERE 1 - (oe.embedding <=> query_embedding) > match_threshold
    ORDER BY oe.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Function to get confidence statistics
CREATE OR REPLACE FUNCTION get_confidence_stats()
RETURNS TABLE (
    total_links BIGINT,
    avg_confidence NUMERIC,
    min_confidence NUMERIC,
    max_confidence NUMERIC,
    high_confidence BIGINT,
    medium_confidence BIGINT,
    low_confidence BIGINT
)
LANGUAGE SQL
AS $$
    WITH all_links AS (
        SELECT confidence FROM vulnerability_links
        UNION ALL
        SELECT confidence FROM ofc_links
    )
    SELECT 
        COUNT(*) as total_links,
        AVG(confidence) as avg_confidence,
        MIN(confidence) as min_confidence,
        MAX(confidence) as max_confidence,
        COUNT(*) FILTER (WHERE confidence >= 0.9) as high_confidence,
        COUNT(*) FILTER (WHERE confidence >= 0.7 AND confidence < 0.9) as medium_confidence,
        COUNT(*) FILTER (WHERE confidence < 0.7) as low_confidence
    FROM all_links;
$$;

-- Function to get gap report
CREATE OR REPLACE FUNCTION get_gap_report(sector_filter TEXT DEFAULT NULL)
RETURNS TABLE (
    vulnerability_id UUID,
    vulnerability_text TEXT,
    sector TEXT,
    subsector TEXT,
    has_ofcs BOOLEAN,
    ofc_count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        v.id as vulnerability_id,
        v.vulnerability as vulnerability_text,
        v.sector,
        v.subsector,
        CASE WHEN COUNT(vol.vulnerability_id) > 0 THEN TRUE ELSE FALSE END as has_ofcs,
        COUNT(vol.vulnerability_id) as ofc_count
    FROM vulnerabilities v
    LEFT JOIN vulnerability_ofc_links vol ON v.id = vol.vulnerability_id
    WHERE (sector_filter IS NULL OR v.sector = sector_filter)
    GROUP BY v.id, v.vulnerability, v.sector, v.subsector
    ORDER BY ofc_count ASC, v.sector, v.subsector;
$$;

-- RLS Policies for security
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofc_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write learning data
CREATE POLICY "Allow authenticated users to manage learning data" ON learning_events
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage embeddings" ON vulnerability_embeddings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage ofc embeddings" ON ofc_embeddings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage similarity cache" ON similarity_cache
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage review queue" ON review_queue
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage links" ON vulnerability_links
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage ofc links" ON ofc_links
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage sector profiles" ON sector_profiles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage pattern rules" ON pattern_rules
    FOR ALL USING (auth.role() = 'authenticated');
