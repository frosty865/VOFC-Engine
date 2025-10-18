-- Simple Sources Schema for VOFC Engine
-- Basic structure without complex RLS policies

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    publication_date DATE,
    document_type TEXT,
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
    vulnerability_id UUID NOT NULL,
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
    ofc_id UUID NOT NULL,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number INTEGER,
    section TEXT,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ofc_id, source_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vulnerability_sources_vulnerability_id ON vulnerability_sources(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_sources_source_id ON vulnerability_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_ofc_id ON ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON ofc_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title);
CREATE INDEX IF NOT EXISTS idx_sources_organization ON sources(organization);

-- Insert some sample sources
INSERT INTO sources (title, author, organization, document_type, description) VALUES
('CISA Physical Security Guidelines', 'CISA', 'CISA', 'guideline', 'Comprehensive guidelines for physical security measures'),
('NIST Cybersecurity Framework', 'NIST', 'NIST', 'standard', 'Framework for improving critical infrastructure cybersecurity'),
('DHS Protective Security Guidelines', 'DHS', 'DHS', 'guideline', 'Guidelines for protective security measures'),
('ASIS International Standards', 'ASIS', 'ASIS International', 'standard', 'International standards for security management'),
('NFPA 730 Security Management', 'NFPA', 'NFPA', 'standard', 'National Fire Protection Association security management standard')
ON CONFLICT DO NOTHING;

