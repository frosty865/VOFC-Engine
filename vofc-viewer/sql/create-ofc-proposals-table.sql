-- Create OFC Proposals table for auto-generated OFCs
CREATE TABLE IF NOT EXISTS ofc_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vulnerability_id UUID NOT NULL,
    text TEXT NOT NULL,
    source VARCHAR(500),
    confidence DECIMAL(3,2) DEFAULT 0.7,
    tone_match BOOLEAN DEFAULT true,
    verified_source BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT false,
    model_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ofc_proposals_vulnerability_id ON ofc_proposals(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_ofc_proposals_requires_review ON ofc_proposals(requires_review);
CREATE INDEX IF NOT EXISTS idx_ofc_proposals_created_at ON ofc_proposals(created_at);

-- Add RLS policies
ALTER TABLE ofc_proposals ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read proposals
CREATE POLICY "Users can view OFC proposals" ON ofc_proposals
    FOR SELECT USING (true);

-- Policy for service role to insert/update proposals
CREATE POLICY "Service role can manage OFC proposals" ON ofc_proposals
    FOR ALL USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ofc_proposals_updated_at 
    BEFORE UPDATE ON ofc_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function to get vulnerabilities missing OFCs
CREATE OR REPLACE FUNCTION get_vulns_missing_ofcs()
RETURNS TABLE(
    id uuid, 
    vulnerability text, 
    existing_ofcs jsonb
)
LANGUAGE sql AS $$
  SELECT
    v.id,
    v.vulnerability,
    COALESCE(
        json_agg(
            json_build_object(
                'id', o.id,
                'text', o.option_text,
                'source', o.source,
                'discipline', o.discipline
            )
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::json
    ) as existing_ofcs
  FROM vulnerabilities v
  LEFT JOIN options_for_consideration o ON o.vulnerability_id = v.id
  GROUP BY v.id, v.vulnerability
  HAVING COUNT(o.id) < 3
  ORDER BY v.created_at DESC;
$$;
