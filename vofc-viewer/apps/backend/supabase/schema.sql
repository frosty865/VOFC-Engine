-- VOFC Database Schema Reference
-- This file contains the database schema for reference purposes

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability TEXT NOT NULL,
    discipline TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Options for Consideration table
CREATE TABLE IF NOT EXISTS options_for_consideration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_text TEXT NOT NULL,
    discipline TEXT,
    vulnerability_id UUID REFERENCES vulnerabilities(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_text TEXT NOT NULL,
    reference_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vulnerability-OFC Links table
CREATE TABLE IF NOT EXISTS vulnerability_ofc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID REFERENCES vulnerabilities(id),
    ofc_id UUID REFERENCES options_for_consideration(id),
    link_type TEXT DEFAULT 'direct',
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OFC-Source Links table
CREATE TABLE IF NOT EXISTS ofc_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ofc_id UUID REFERENCES options_for_consideration(id),
    source_id UUID REFERENCES sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discipline ON vulnerabilities(discipline);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_created_at ON vulnerabilities(created_at);
CREATE INDEX IF NOT EXISTS idx_ofcs_discipline ON options_for_consideration(discipline);
CREATE INDEX IF NOT EXISTS idx_ofcs_vulnerability_id ON options_for_consideration(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_sources_reference_number ON sources(reference_number);
CREATE INDEX IF NOT EXISTS idx_vuln_ofc_links_vulnerability_id ON vulnerability_ofc_links(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_vuln_ofc_links_ofc_id ON vulnerability_ofc_links(ofc_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_ofc_id ON ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON ofc_sources(source_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_search ON vulnerabilities USING gin(to_tsvector('english', vulnerability));
CREATE INDEX IF NOT EXISTS idx_ofcs_search ON options_for_consideration USING gin(to_tsvector('english', option_text));
CREATE INDEX IF NOT EXISTS idx_sources_search ON sources USING gin(to_tsvector('english', source_text));

-- Row Level Security (RLS) policies
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofc_sources ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access" ON vulnerabilities FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON options_for_consideration FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sources FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON vulnerability_ofc_links FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON ofc_sources FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON vulnerabilities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON options_for_consideration FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON vulnerability_ofc_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON ofc_sources FOR ALL USING (auth.role() = 'service_role');

-- Views for common queries
CREATE OR REPLACE VIEW vulnerabilities_with_ofcs AS
SELECT 
    v.id,
    v.vulnerability,
    v.discipline,
    v.created_at,
    v.updated_at,
    COUNT(vol.ofc_id) as ofc_count
FROM vulnerabilities v
LEFT JOIN vulnerability_ofc_links vol ON v.id = vol.vulnerability_id
GROUP BY v.id, v.vulnerability, v.discipline, v.created_at, v.updated_at;

CREATE OR REPLACE VIEW ofcs_with_sources AS
SELECT 
    o.id,
    o.option_text,
    o.discipline,
    o.vulnerability_id,
    o.created_at,
    o.updated_at,
    COUNT(os.source_id) as source_count
FROM options_for_consideration o
LEFT JOIN ofc_sources os ON o.id = os.ofc_id
GROUP BY o.id, o.option_text, o.discipline, o.vulnerability_id, o.created_at, o.updated_at;

-- Functions for data integrity
CREATE OR REPLACE FUNCTION check_orphaned_ofcs()
RETURNS TABLE(ofc_id UUID, option_text TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.option_text
    FROM options_for_consideration o
    LEFT JOIN vulnerability_ofc_links vol ON o.id = vol.ofc_id
    WHERE vol.ofc_id IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_orphaned_links()
RETURNS TABLE(link_id UUID, vulnerability_id UUID, ofc_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT vol.id, vol.vulnerability_id, vol.ofc_id
    FROM vulnerability_ofc_links vol
    LEFT JOIN vulnerabilities v ON vol.vulnerability_id = v.id
    LEFT JOIN options_for_consideration o ON vol.ofc_id = o.id
    WHERE v.id IS NULL OR o.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vulnerabilities_updated_at
    BEFORE UPDATE ON vulnerabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ofcs_updated_at
    BEFORE UPDATE ON options_for_consideration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
