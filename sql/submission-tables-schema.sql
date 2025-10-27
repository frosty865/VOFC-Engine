-- Submission Mirror Tables Schema
-- These tables mirror the production tables but are specifically for submissions
-- Data is stored here during the review process before moving to production tables

-- Submission Vulnerabilities table (mirror of vulnerabilities)
CREATE TABLE IF NOT EXISTS submission_vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    vulnerability TEXT NOT NULL,
    discipline TEXT,
    source TEXT,
    source_title TEXT,
    source_url TEXT,
    ofc_count INTEGER DEFAULT 0,
    vulnerability_count INTEGER DEFAULT 0,
    enhanced_extraction JSONB,
    parsed_at TIMESTAMP WITH TIME ZONE,
    parser_version TEXT,
    extraction_stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission Options for Consideration table (mirror of options_for_consideration)
CREATE TABLE IF NOT EXISTS submission_options_for_consideration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    discipline TEXT,
    vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
    source TEXT,
    source_title TEXT,
    source_url TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    pattern_matched TEXT,
    context TEXT,
    citations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission Sources table (mirror of sources)
CREATE TABLE IF NOT EXISTS submission_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    reference_number TEXT,
    source_title TEXT,
    source_url TEXT,
    author_org TEXT,
    publication_year INTEGER,
    content_restriction TEXT DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission Vulnerability-OFC Links table (mirror of vulnerability_ofc_links)
CREATE TABLE IF NOT EXISTS submission_vulnerability_ofc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
    ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
    link_type TEXT DEFAULT 'direct',
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission OFC-Source Links table (mirror of ofc_sources)
CREATE TABLE IF NOT EXISTS submission_ofc_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    ofc_id UUID REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
    source_id UUID REFERENCES submission_sources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_created_at ON submission_vulnerabilities(created_at);

CREATE INDEX IF NOT EXISTS idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline);
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_vulnerability_id ON submission_options_for_consideration(vulnerability_id);

CREATE INDEX IF NOT EXISTS idx_submission_sources_submission_id ON submission_sources(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_sources_reference_number ON submission_sources(reference_number);

CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_submission_id ON submission_vulnerability_ofc_links(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_vulnerability_id ON submission_vulnerability_ofc_links(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_submission_vuln_ofc_links_ofc_id ON submission_vulnerability_ofc_links(ofc_id);

CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_submission_id ON submission_ofc_sources(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_ofc_id ON submission_ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_source_id ON submission_ofc_sources(source_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_search ON submission_vulnerabilities USING gin(to_tsvector('english', vulnerability));
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_search ON submission_options_for_consideration USING gin(to_tsvector('english', option_text));
CREATE INDEX IF NOT EXISTS idx_submission_sources_search ON submission_sources USING gin(to_tsvector('english', source_text));

-- Row Level Security (RLS) policies
ALTER TABLE submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_ofc_sources ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to submission tables
CREATE POLICY "Allow service role full access" ON submission_vulnerabilities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON submission_options_for_consideration FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON submission_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON submission_vulnerability_ofc_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON submission_ofc_sources FOR ALL USING (auth.role() = 'service_role');

-- Views for common queries
CREATE OR REPLACE VIEW submission_vulnerabilities_with_ofcs AS
SELECT 
    sv.id,
    sv.submission_id,
    sv.vulnerability,
    sv.discipline,
    sv.source,
    sv.source_title,
    sv.source_url,
    sv.ofc_count,
    sv.vulnerability_count,
    sv.enhanced_extraction,
    sv.parsed_at,
    sv.parser_version,
    sv.extraction_stats,
    sv.created_at,
    sv.updated_at,
    COUNT(svol.ofc_id) as linked_ofc_count
FROM submission_vulnerabilities sv
LEFT JOIN submission_vulnerability_ofc_links svol ON sv.id = svol.vulnerability_id
GROUP BY sv.id, sv.submission_id, sv.vulnerability, sv.discipline, sv.source, sv.source_title, sv.source_url, sv.ofc_count, sv.vulnerability_count, sv.enhanced_extraction, sv.parsed_at, sv.parser_version, sv.extraction_stats, sv.created_at, sv.updated_at;

CREATE OR REPLACE VIEW submission_ofcs_with_sources AS
SELECT 
    so.id,
    so.submission_id,
    so.option_text,
    so.discipline,
    so.vulnerability_id,
    so.source,
    so.source_title,
    so.source_url,
    so.confidence_score,
    so.pattern_matched,
    so.context,
    so.citations,
    so.created_at,
    so.updated_at,
    COUNT(sos.source_id) as source_count
FROM submission_options_for_consideration so
LEFT JOIN submission_ofc_sources sos ON so.id = sos.ofc_id
GROUP BY so.id, so.submission_id, so.option_text, so.discipline, so.vulnerability_id, so.source, so.source_title, so.source_url, so.confidence_score, so.pattern_matched, so.context, so.citations, so.created_at, so.updated_at;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_submission_vulnerabilities_updated_at
    BEFORE UPDATE ON submission_vulnerabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_ofcs_updated_at
    BEFORE UPDATE ON submission_options_for_consideration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_sources_updated_at
    BEFORE UPDATE ON submission_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to move submission data to production tables
CREATE OR REPLACE FUNCTION move_submission_to_production(submission_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    vuln_record RECORD;
    ofc_record RECORD;
    source_record RECORD;
    new_vuln_id UUID;
    new_ofc_id UUID;
    new_source_id UUID;
BEGIN
    -- Move vulnerabilities
    FOR vuln_record IN 
        SELECT * FROM submission_vulnerabilities 
        WHERE submission_id = submission_uuid
    LOOP
        INSERT INTO vulnerabilities (vulnerability, discipline, created_at, updated_at)
        VALUES (vuln_record.vulnerability, vuln_record.discipline, vuln_record.created_at, vuln_record.updated_at)
        RETURNING id INTO new_vuln_id;
        
        -- Move associated OFCs
        FOR ofc_record IN 
            SELECT * FROM submission_options_for_consideration 
            WHERE submission_id = submission_uuid AND vulnerability_id = vuln_record.id
        LOOP
            INSERT INTO options_for_consideration (option_text, discipline, vulnerability_id, created_at, updated_at)
            VALUES (ofc_record.option_text, ofc_record.discipline, new_vuln_id, ofc_record.created_at, ofc_record.updated_at)
            RETURNING id INTO new_ofc_id;
            
            -- Create vulnerability-OFC link
            INSERT INTO vulnerability_ofc_links (vulnerability_id, ofc_id, link_type, confidence_score, created_at)
            VALUES (new_vuln_id, new_ofc_id, 'direct', ofc_record.confidence_score, ofc_record.created_at);
        END LOOP;
    END LOOP;
    
    -- Move sources
    FOR source_record IN 
        SELECT * FROM submission_sources 
        WHERE submission_id = submission_uuid
    LOOP
        INSERT INTO sources (source_text, reference_number, created_at, updated_at)
        VALUES (source_record.source_text, source_record.reference_number, source_record.created_at, source_record.updated_at)
        RETURNING id INTO new_source_id;
    END LOOP;
    
    -- Update submission status
    UPDATE submissions 
    SET status = 'approved', updated_at = NOW() 
    WHERE id = submission_uuid;
    
    result := json_build_object(
        'success', true,
        'message', 'Submission moved to production successfully',
        'submission_id', submission_uuid
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up submission data after approval
CREATE OR REPLACE FUNCTION cleanup_submission_data(submission_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Delete all submission-specific data (cascade will handle related records)
    DELETE FROM submission_vulnerabilities WHERE submission_id = submission_uuid;
    DELETE FROM submission_options_for_consideration WHERE submission_id = submission_uuid;
    DELETE FROM submission_sources WHERE submission_id = submission_uuid;
    DELETE FROM submission_vulnerability_ofc_links WHERE submission_id = submission_uuid;
    DELETE FROM submission_ofc_sources WHERE submission_id = submission_uuid;
    
    result := json_build_object(
        'success', true,
        'message', 'Submission data cleaned up successfully',
        'submission_id', submission_uuid
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
