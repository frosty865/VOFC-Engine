-- Sources Schema for VOFC Engine
-- This creates a proper relational structure for sources

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    publication_date DATE,
    document_type TEXT CHECK (document_type IN ('guideline', 'standard', 'regulation', 'best_practice', 'technical_specification', 'other')),
    organization TEXT,
    url TEXT,
    isbn TEXT,
    doi TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vulnerability_sources linking table
CREATE TABLE IF NOT EXISTS vulnerability_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number INTEGER,
    section TEXT,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vulnerability_id, source_id)
);

-- Create ofc_sources linking table  
CREATE TABLE IF NOT EXISTS ofc_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ofc_id UUID NOT NULL REFERENCES options_for_consideration(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number INTEGER,
    section TEXT,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ofc_id, source_id)
);

-- Enable RLS on all tables
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofc_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sources table
CREATE POLICY "sources_are_public" ON sources FOR SELECT USING (true);
CREATE POLICY "admins_can_manage_sources" ON sources FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vofc_users 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- RLS Policies for vulnerability_sources
CREATE POLICY "vulnerability_sources_are_public" ON vulnerability_sources FOR SELECT USING (true);
CREATE POLICY "admins_can_manage_vulnerability_sources" ON vulnerability_sources FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vofc_users 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- RLS Policies for ofc_sources
CREATE POLICY "ofc_sources_are_public" ON ofc_sources FOR SELECT USING (true);
CREATE POLICY "admins_can_manage_ofc_sources" ON ofc_sources FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vofc_users 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerability_sources_vulnerability_id ON vulnerability_sources(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_sources_source_id ON vulnerability_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_ofc_id ON ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON ofc_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title);
CREATE INDEX IF NOT EXISTS idx_sources_organization ON sources(organization);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample sources
INSERT INTO sources (title, author, organization, document_type, description) VALUES
('CISA Physical Security Guidelines', 'CISA', 'CISA', 'guideline', 'Comprehensive guidelines for physical security measures'),
('NIST Cybersecurity Framework', 'NIST', 'NIST', 'standard', 'Framework for improving critical infrastructure cybersecurity'),
('DHS Protective Security Guidelines', 'DHS', 'DHS', 'guideline', 'Guidelines for protective security measures'),
('ASIS International Standards', 'ASIS', 'ASIS International', 'standard', 'International standards for security management'),
('NFPA 730 Security Management', 'NFPA', 'NFPA', 'standard', 'National Fire Protection Association security management standard')
ON CONFLICT DO NOTHING;

