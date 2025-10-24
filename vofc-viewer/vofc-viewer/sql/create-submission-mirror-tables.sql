-- Create Submission Mirror Tables
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create submission_vulnerabilities table
CREATE TABLE IF NOT EXISTS submission_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
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

-- 2. Create submission_options_for_consideration table
CREATE TABLE IF NOT EXISTS submission_options_for_consideration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  discipline TEXT,
  vulnerability_id UUID REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
  source TEXT,
  source_title TEXT,
  source_url TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.8,
  pattern_matched TEXT,
  context TEXT,
  citations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create submission_sources table
CREATE TABLE IF NOT EXISTS submission_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
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

-- 4. Create submission_vulnerability_ofc_links table
CREATE TABLE IF NOT EXISTS submission_vulnerability_ofc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  vulnerability_id UUID NOT NULL REFERENCES submission_vulnerabilities(id) ON DELETE CASCADE,
  ofc_id UUID NOT NULL REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'direct',
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create submission_ofc_sources table
CREATE TABLE IF NOT EXISTS submission_ofc_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  ofc_id UUID NOT NULL REFERENCES submission_options_for_consideration(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES submission_sources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_created_at ON submission_vulnerabilities(created_at);

CREATE INDEX IF NOT EXISTS idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_vulnerability_id ON submission_options_for_consideration(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline);

CREATE INDEX IF NOT EXISTS idx_submission_sources_submission_id ON submission_sources(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_sources_reference_number ON submission_sources(reference_number);

CREATE INDEX IF NOT EXISTS idx_submission_links_submission_id ON submission_vulnerability_ofc_links(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_links_vulnerability_id ON submission_vulnerability_ofc_links(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_submission_links_ofc_id ON submission_vulnerability_ofc_links(ofc_id);

CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_submission_id ON submission_ofc_sources(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_ofc_id ON submission_ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofc_sources_source_id ON submission_ofc_sources(source_id);

-- Enable Row Level Security
ALTER TABLE submission_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_options_for_consideration ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_vulnerability_ofc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_ofc_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can view all submission vulnerabilities" ON submission_vulnerabilities
  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      SELECT email FROM vofc_users WHERE role = 'admin'
    )
  ));

CREATE POLICY "Admin can view all submission ofcs" ON submission_options_for_consideration
  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      SELECT email FROM vofc_users WHERE role = 'admin'
    )
  ));

CREATE POLICY "Admin can view all submission sources" ON submission_sources
  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      SELECT email FROM vofc_users WHERE role = 'admin'
    )
  ));

CREATE POLICY "Admin can view all submission links" ON submission_vulnerability_ofc_links
  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      SELECT email FROM vofc_users WHERE role = 'admin'
    )
  ));

CREATE POLICY "Admin can view all submission ofc sources" ON submission_ofc_sources
  FOR ALL USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      SELECT email FROM vofc_users WHERE role = 'admin'
    )
  ));

-- Add comments for documentation
COMMENT ON TABLE submission_vulnerabilities IS 'Stores vulnerability data during submission review process';
COMMENT ON TABLE submission_options_for_consideration IS 'Stores OFC data during submission review process';
COMMENT ON TABLE submission_sources IS 'Stores source references during submission review process';
COMMENT ON TABLE submission_vulnerability_ofc_links IS 'Links vulnerabilities to OFCs in submissions';
COMMENT ON TABLE submission_ofc_sources IS 'Links OFCs to sources in submissions';

-- Success message
SELECT 'Submission mirror tables created successfully!' as message;
