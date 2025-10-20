-- Initial VOFC Database Schema
-- This migration creates the initial database schema for the VOFC system

-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
    sector_id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    vulnerability_id SERIAL PRIMARY KEY,
    vulnerability_name VARCHAR(255) NOT NULL,
    description TEXT,
    severity_level VARCHAR(20) DEFAULT 'Medium',
    source_document VARCHAR(255),
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    question_id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    sector_id INTEGER REFERENCES sectors(sector_id),
    display_order INTEGER DEFAULT 1,
    parent_id INTEGER REFERENCES questions(question_id),
    conditional_trigger TEXT,
    technology_class VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    source_document VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create OFCs (Options for Consideration) table
CREATE TABLE IF NOT EXISTS ofcs (
    ofc_id SERIAL PRIMARY KEY,
    ofc_text TEXT NOT NULL,
    technology_class VARCHAR(100),
    source_doc VARCHAR(255),
    effort_level VARCHAR(20) DEFAULT 'Medium',
    effectiveness VARCHAR(20) DEFAULT 'Medium',
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question-OFC mapping table
CREATE TABLE IF NOT EXISTS question_ofc_map (
    question_id INTEGER REFERENCES questions(question_id) ON DELETE CASCADE,
    ofc_id INTEGER REFERENCES ofcs(ofc_id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (question_id, ofc_id)
);

-- Create question-vulnerability mapping table
CREATE TABLE IF NOT EXISTS question_vulnerability_map (
    question_id INTEGER REFERENCES questions(question_id) ON DELETE CASCADE,
    vulnerability_id INTEGER REFERENCES vulnerabilities(vulnerability_id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (question_id, vulnerability_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_sector_id ON questions(sector_id);
CREATE INDEX IF NOT EXISTS idx_questions_parent_id ON questions(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_technology_class ON questions(technology_class);
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);

CREATE INDEX IF NOT EXISTS idx_ofcs_technology_class ON ofcs(technology_class);
CREATE INDEX IF NOT EXISTS idx_ofcs_effort_level ON ofcs(effort_level);
CREATE INDEX IF NOT EXISTS idx_ofcs_effectiveness ON ofcs(effectiveness);

CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity_level);

CREATE INDEX IF NOT EXISTS idx_question_ofc_map_question_id ON question_ofc_map(question_id);
CREATE INDEX IF NOT EXISTS idx_question_ofc_map_ofc_id ON question_ofc_map(ofc_id);

CREATE INDEX IF NOT EXISTS idx_question_vulnerability_map_question_id ON question_vulnerability_map(question_id);
CREATE INDEX IF NOT EXISTS idx_question_vulnerability_map_vulnerability_id ON question_vulnerability_map(vulnerability_id);

-- Insert default sectors
INSERT INTO sectors (sector_name, description) VALUES
('General', 'General security assessment questions'),
('Education (K-12)', 'K-12 education sector specific questions'),
('Energy', 'Energy sector specific questions'),
('Transportation', 'Transportation sector specific questions')
ON CONFLICT (sector_name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vulnerabilities_updated_at BEFORE UPDATE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ofcs_updated_at BEFORE UPDATE ON ofcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_ofc_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_vulnerability_map ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now - can be restricted later)
CREATE POLICY "Allow all operations on sectors" ON sectors FOR ALL USING (true);
CREATE POLICY "Allow all operations on questions" ON questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on vulnerabilities" ON vulnerabilities FOR ALL USING (true);
CREATE POLICY "Allow all operations on ofcs" ON ofcs FOR ALL USING (true);
CREATE POLICY "Allow all operations on question_ofc_map" ON question_ofc_map FOR ALL USING (true);
CREATE POLICY "Allow all operations on question_vulnerability_map" ON question_vulnerability_map FOR ALL USING (true);
