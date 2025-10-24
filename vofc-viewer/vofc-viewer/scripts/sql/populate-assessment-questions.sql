-- Assessment Questions for VOFC System
-- These are security assessment questions that can be used to evaluate facilities

-- First, ensure we have a questions table with the right structure
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    sector_id INTEGER,
    technology_class TEXT,
    discipline TEXT,
    question_type TEXT DEFAULT 'assessment',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert assessment questions
INSERT INTO questions (question_text, sector_id, technology_class, discipline, question_type) VALUES
-- Physical Security Questions
('Are security cameras properly positioned and functioning to monitor critical areas?', 1, 'Physical Security', 'Physical Security', 'assessment'),
('Is access control properly implemented and functioning at all entry points?', 1, 'Physical Security', 'Physical Security', 'assessment'),
('Are intrusion detection and alarm systems properly installed and operational?', 1, 'Physical Security', 'Physical Security', 'assessment'),
('Is perimeter lighting adequate and properly maintained for security purposes?', 1, 'Physical Security', 'Physical Security', 'assessment'),
('Are perimeter barriers and fencing adequate and properly maintained?', 1, 'Physical Security', 'Physical Security', 'assessment'),

-- Personnel Security Questions
('Is security personnel properly trained and positioned to monitor facility security?', 1, 'Physical Security', 'Personnel Security', 'assessment'),
('Are background checks conducted for all personnel with access to sensitive areas?', 1, 'Personnel Security', 'Personnel Security', 'assessment'),
('Is there a clear chain of command and reporting structure for security personnel?', 1, 'Personnel Security', 'Personnel Security', 'assessment'),

-- Operational Security Questions
('Are fire safety systems properly installed and regularly tested?', 1, 'Safety Systems', 'Operational Security', 'assessment'),
('Are backup power systems properly installed and regularly tested?', 1, 'Infrastructure', 'Operational Security', 'assessment'),
('Are emergency communication systems properly installed and functional?', 1, 'Communication Systems', 'Operational Security', 'assessment'),
('Are emergency evacuation procedures clearly posted and regularly practiced?', 1, 'Safety Systems', 'Operational Security', 'assessment'),

-- Cybersecurity Questions
('Are cybersecurity measures properly implemented and regularly updated?', 1, 'Information Technology', 'Cybersecurity', 'assessment'),
('Are network security controls properly configured and monitored?', 1, 'Information Technology', 'Cybersecurity', 'assessment'),
('Are data backup and recovery procedures properly implemented?', 1, 'Information Technology', 'Cybersecurity', 'assessment'),

-- General Security Questions
('Are security policies and procedures clearly documented and communicated?', 1, 'General', 'General Security', 'assessment'),
('Are security incidents properly reported and investigated?', 1, 'General', 'General Security', 'assessment'),
('Are security assessments conducted regularly and findings addressed?', 1, 'General', 'General Security', 'assessment');

-- Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for questions
CREATE POLICY "Allow public read access to questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage questions" ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM vofc_users WHERE user_id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM vofc_users WHERE user_id = auth.uid() AND role = 'admin')
);

