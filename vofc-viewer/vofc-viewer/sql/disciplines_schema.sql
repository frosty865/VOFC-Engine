-- Disciplines table schema
-- This table will store the available security disciplines

CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- e.g., 'Physical', 'Cyber', 'Converged'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_disciplines_name ON disciplines(name);
CREATE INDEX IF NOT EXISTS idx_disciplines_category ON disciplines(category);
CREATE INDEX IF NOT EXISTS idx_disciplines_active ON disciplines(is_active);

-- Row Level Security
ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON disciplines FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON disciplines FOR ALL USING (auth.role() = 'service_role');

-- Insert default disciplines
INSERT INTO disciplines (name, description, category) VALUES
-- Physical Security Disciplines
('Physical Security', 'Physical security measures and controls', 'Physical'),
('Access Control', 'Physical and logical access control systems', 'Physical'),
('Perimeter Security', 'Building and facility perimeter protection', 'Physical'),
('Security Force', 'Security personnel and guard services', 'Physical'),
('Surveillance', 'CCTV, monitoring, and observation systems', 'Physical'),
('Emergency Response', 'Emergency preparedness and response procedures', 'Physical'),
('Visitor Management', 'Guest and visitor access control', 'Physical'),
('Asset Protection', 'Physical asset security and protection', 'Physical'),

-- Cybersecurity Disciplines
('Cybersecurity', 'Information technology security', 'Cyber'),
('Network Security', 'Network infrastructure protection', 'Cyber'),
('Data Protection', 'Data security and privacy controls', 'Cyber'),
('Identity Management', 'User authentication and authorization', 'Cyber'),
('Incident Response', 'Cybersecurity incident handling', 'Cyber'),
('Security Awareness', 'User training and security education', 'Cyber'),
('Vulnerability Management', 'System vulnerability assessment and remediation', 'Cyber'),
('Security Operations', 'Security monitoring and operations center', 'Cyber'),

-- Converged Security Disciplines
('Security Management', 'Overall security program management', 'Converged'),
('Risk Management', 'Security risk assessment and mitigation', 'Converged'),
('Compliance', 'Regulatory and policy compliance', 'Converged'),
('Security Architecture', 'Security system design and implementation', 'Converged'),
('Business Continuity', 'Continuity planning and disaster recovery', 'Converged'),
('Security Training', 'Security education and awareness programs', 'Converged'),
('Security Assessment', 'Security evaluation and testing', 'Converged'),
('Security Policy', 'Security policy development and enforcement', 'Converged'),

-- General Disciplines
('General', 'General security considerations', 'General'),
('Other', 'Other security disciplines not specifically categorized', 'General')
ON CONFLICT (name) DO NOTHING;

-- Update existing tables to reference disciplines table
-- First, add discipline_id columns
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS discipline_id UUID REFERENCES disciplines(id);
ALTER TABLE options_for_consideration ADD COLUMN IF NOT EXISTS discipline_id UUID REFERENCES disciplines(id);

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discipline_id ON vulnerabilities(discipline_id);
CREATE INDEX IF NOT EXISTS idx_ofcs_discipline_id ON options_for_consideration(discipline_id);

-- Function to migrate existing discipline text to discipline_id
CREATE OR REPLACE FUNCTION migrate_disciplines_to_ids()
RETURNS void AS $$
DECLARE
    disc_record RECORD;
BEGIN
    -- Migrate vulnerabilities
    FOR disc_record IN 
        SELECT DISTINCT discipline FROM vulnerabilities WHERE discipline IS NOT NULL AND discipline != ''
    LOOP
        UPDATE vulnerabilities 
        SET discipline_id = (SELECT id FROM disciplines WHERE name = disc_record.discipline)
        WHERE discipline = disc_record.discipline;
    END LOOP;
    
    -- Migrate options_for_consideration
    FOR disc_record IN 
        SELECT DISTINCT discipline FROM options_for_consideration WHERE discipline IS NOT NULL AND discipline != ''
    LOOP
        UPDATE options_for_consideration 
        SET discipline_id = (SELECT id FROM disciplines WHERE name = disc_record.discipline)
        WHERE discipline = disc_record.discipline;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_disciplines_to_ids();

-- Drop the migration function after use
DROP FUNCTION migrate_disciplines_to_ids();
