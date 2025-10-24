-- Fix column names in existing tables
-- This script fixes the column naming issues that are causing 400 errors

-- Fix sources table column names
ALTER TABLE sources RENAME COLUMN "reference number" TO reference_number;
ALTER TABLE sources RENAME COLUMN "source" TO source_text;

-- Update indexes to match new column names
DROP INDEX IF EXISTS idx_sources_reference_number;
CREATE INDEX IF NOT EXISTS idx_sources_reference_number ON sources(reference_number);

-- Update the schema to match the application expectations
-- The application expects these column names:
-- sources: id, reference_number, source_text
-- subsectors: id, name, sector_id (not subsector_name)
-- sectors: id, name

-- If subsectors table doesn't exist, create it with correct column names
CREATE TABLE IF NOT EXISTS subsectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sector_id UUID REFERENCES sectors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If sectors table doesn't exist, create it
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disciplines table if it doesn't exist
CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sectors_name ON sectors(name);
CREATE INDEX IF NOT EXISTS idx_subsectors_name ON subsectors(name);
CREATE INDEX IF NOT EXISTS idx_subsectors_sector_id ON subsectors(sector_id);
CREATE INDEX IF NOT EXISTS idx_disciplines_name ON disciplines(name);
CREATE INDEX IF NOT EXISTS idx_disciplines_category ON disciplines(category);
CREATE INDEX IF NOT EXISTS idx_disciplines_active ON disciplines(is_active);

-- Enable RLS
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to subsectors" ON subsectors FOR SELECT USING (true);
CREATE POLICY "Allow public read access to disciplines" ON disciplines FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to sectors" ON sectors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to subsectors" ON subsectors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to disciplines" ON disciplines FOR ALL USING (auth.role() = 'service_role');

-- Insert some default data if tables are empty
INSERT INTO sectors (id, name, description) VALUES 
    (gen_random_uuid(), 'Critical Infrastructure', 'Essential services and systems'),
    (gen_random_uuid(), 'Cybersecurity', 'Information security and digital systems'),
    (gen_random_uuid(), 'Physical Security', 'Physical protection and access control'),
    (gen_random_uuid(), 'Emergency Management', 'Disaster response and preparedness'),
    (gen_random_uuid(), 'Personnel Security', 'Human resources and background checks')
ON CONFLICT DO NOTHING;

-- Insert some default subsectors
INSERT INTO subsectors (name, description, sector_id) 
SELECT 
    'Power Grid',
    'Electrical power generation and distribution',
    s.id
FROM sectors s WHERE s.name = 'Critical Infrastructure'
ON CONFLICT DO NOTHING;

INSERT INTO subsectors (name, description, sector_id) 
SELECT 
    'Water Systems',
    'Water treatment and distribution',
    s.id
FROM sectors s WHERE s.name = 'Critical Infrastructure'
ON CONFLICT DO NOTHING;

INSERT INTO subsectors (name, description, sector_id) 
SELECT 
    'Network Security',
    'Computer network protection',
    s.id
FROM sectors s WHERE s.name = 'Cybersecurity'
ON CONFLICT DO NOTHING;

INSERT INTO subsectors (name, description, sector_id) 
SELECT 
    'Access Control',
    'Physical access management',
    s.id
FROM sectors s WHERE s.name = 'Physical Security'
ON CONFLICT DO NOTHING;

-- Insert some default disciplines
INSERT INTO disciplines (name, category, description) VALUES 
    ('Security Force', 'Physical', 'Physical security personnel and procedures'),
    ('IT Security', 'Technical', 'Information technology security'),
    ('Emergency Response', 'Operational', 'Emergency and disaster response'),
    ('Risk Management', 'Administrative', 'Risk assessment and mitigation'),
    ('Compliance', 'Administrative', 'Regulatory compliance and auditing')
ON CONFLICT DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sectors_updated_at
    BEFORE UPDATE ON sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subsectors_updated_at
    BEFORE UPDATE ON subsectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disciplines_updated_at
    BEFORE UPDATE ON disciplines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
