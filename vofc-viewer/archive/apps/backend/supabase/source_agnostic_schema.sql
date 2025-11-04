-- Source-Agnostic Ingestion Schema Updates
-- Adds support for flexible document sources with metadata and trust workflow

-- Update sources table with new metadata fields
ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'unknown';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_confidence NUMERIC DEFAULT 0.0;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS author_org TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS publication_year INTEGER;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS content_restriction TEXT DEFAULT 'public';

-- Create source types enum
CREATE TYPE source_type_enum AS ENUM (
  'government',
  'academic', 
  'corporate',
  'field_note',
  'media',
  'unknown'
);

-- Create review status enum
CREATE TYPE review_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_review'
);

-- Create content restriction enum
CREATE TYPE content_restriction_enum AS ENUM (
  'public',
  'restricted',
  'confidential',
  'classified'
);

-- Update columns to use enums
ALTER TABLE sources ALTER COLUMN source_type TYPE source_type_enum USING source_type::source_type_enum;
ALTER TABLE sources ALTER COLUMN review_status TYPE review_status_enum USING review_status::review_status_enum;
ALTER TABLE sources ALTER COLUMN content_restriction TYPE content_restriction_enum USING content_restriction::content_restriction_enum;

-- Add constraints
ALTER TABLE sources ADD CONSTRAINT check_source_confidence 
  CHECK (source_confidence >= 0.0 AND source_confidence <= 1.0);

ALTER TABLE sources ADD CONSTRAINT check_publication_year 
  CHECK (publication_year >= 1900 AND publication_year <= EXTRACT(YEAR FROM NOW()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_review_status ON sources(review_status);
CREATE INDEX IF NOT EXISTS idx_sources_submitted_by ON sources(submitted_by);
CREATE INDEX IF NOT EXISTS idx_sources_confidence ON sources(source_confidence);
CREATE INDEX IF NOT EXISTS idx_sources_year ON sources(publication_year);

-- Create review workflow table
CREATE TABLE IF NOT EXISTS source_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  review_notes TEXT,
  review_decision review_status_enum NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for reviews
CREATE INDEX IF NOT EXISTS idx_source_reviews_source_id ON source_reviews(source_id);
CREATE INDEX IF NOT EXISTS idx_source_reviews_reviewer ON source_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_source_reviews_decision ON source_reviews(review_decision);

-- Create source metadata table for additional flexible fields
CREATE TABLE IF NOT EXISTS source_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  metadata_key TEXT NOT NULL,
  metadata_value TEXT,
  metadata_type TEXT DEFAULT 'text', -- text, number, boolean, json
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for metadata
CREATE INDEX IF NOT EXISTS idx_source_metadata_source_id ON source_metadata(source_id);
CREATE INDEX IF NOT EXISTS idx_source_metadata_key ON source_metadata(metadata_key);

-- Create RLS policies for source-agnostic access
-- PSAs can submit sources but only approved ones are public
CREATE POLICY "PSAs can submit sources" ON sources
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by IS NOT NULL AND
    source_title IS NOT NULL
  );

CREATE POLICY "PSAs can view their own submissions" ON sources
  FOR SELECT TO authenticated
  USING (submitted_by = auth.jwt() ->> 'email');

CREATE POLICY "Analysts can view all sources" ON sources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.jwt() ->> 'email' 
      AND role IN ('analyst', 'admin', 'spsa', 'psa')
    )
  );

CREATE POLICY "Public can view approved sources" ON sources
  FOR SELECT TO anon
  USING (review_status = 'approved');

-- Create function to update review status
CREATE OR REPLACE FUNCTION update_source_review_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the source's review status when a review is created/updated
  UPDATE sources 
  SET 
    review_status = NEW.review_decision,
    reviewed_by = NEW.reviewer_id,
    reviewed_at = NOW()
  WHERE id = NEW.source_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
CREATE TRIGGER trigger_update_source_review_status
  AFTER INSERT OR UPDATE ON source_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_source_review_status();

-- Create function to calculate source confidence
CREATE OR REPLACE FUNCTION calculate_source_confidence(
  p_source_type source_type_enum,
  p_author_org TEXT,
  p_publication_year INTEGER,
  p_review_count INTEGER DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
  base_confidence NUMERIC := 0.5;
  type_bonus NUMERIC := 0.0;
  org_bonus NUMERIC := 0.0;
  year_bonus NUMERIC := 0.0;
  review_bonus NUMERIC := 0.0;
BEGIN
  -- Base confidence from source type
  CASE p_source_type
    WHEN 'government' THEN type_bonus := 0.3;
    WHEN 'academic' THEN type_bonus := 0.25;
    WHEN 'corporate' THEN type_bonus := 0.15;
    WHEN 'field_note' THEN type_bonus := 0.1;
    WHEN 'media' THEN type_bonus := 0.05;
    ELSE type_bonus := 0.0;
  END CASE;
  
  -- Organization reputation bonus
  IF p_author_org IS NOT NULL THEN
    -- Government agencies get higher confidence
    IF p_author_org ILIKE '%federal%' OR p_author_org ILIKE '%government%' THEN
      org_bonus := 0.2;
    ELSIF p_author_org ILIKE '%university%' OR p_author_org ILIKE '%college%' THEN
      org_bonus := 0.15;
    ELSIF p_author_org ILIKE '%corporation%' OR p_author_org ILIKE '%inc%' THEN
      org_bonus := 0.1;
    ELSE
      org_bonus := 0.05;
    END IF;
  END IF;
  
  -- Recency bonus
  IF p_publication_year IS NOT NULL THEN
    IF p_publication_year >= EXTRACT(YEAR FROM NOW()) - 2 THEN
      year_bonus := 0.1;
    ELSIF p_publication_year >= EXTRACT(YEAR FROM NOW()) - 5 THEN
      year_bonus := 0.05;
    ELSE
      year_bonus := 0.0;
    END IF;
  END IF;
  
  -- Review bonus
  IF p_review_count > 0 THEN
    review_bonus := LEAST(0.2, p_review_count * 0.05);
  END IF;
  
  -- Calculate final confidence (capped at 1.0)
  RETURN LEAST(1.0, base_confidence + type_bonus + org_bonus + year_bonus + review_bonus);
END;
$$ LANGUAGE plpgsql;

-- Create view for approved sources with confidence scores
CREATE OR REPLACE VIEW approved_sources AS
SELECT 
  s.*,
  COALESCE(
    calculate_source_confidence(
      s.source_type,
      s.author_org,
      s.publication_year,
      (SELECT COUNT(*) FROM source_reviews sr WHERE sr.source_id = s.id)
    ),
    s.source_confidence
  ) AS calculated_confidence
FROM sources s
WHERE s.review_status = 'approved';

-- Create view for PSA dashboard
CREATE OR REPLACE VIEW psa_submissions AS
SELECT 
  s.*,
  COUNT(sr.id) as review_count,
  MAX(sr.created_at) as last_reviewed,
  COALESCE(
    calculate_source_confidence(
      s.source_type,
      s.author_org,
      s.publication_year,
      COUNT(sr.id)
    ),
    s.source_confidence
  ) AS calculated_confidence
FROM sources s
LEFT JOIN source_reviews sr ON s.id = sr.source_id
WHERE s.submitted_by = auth.jwt() ->> 'email'
GROUP BY s.id;

-- Grant permissions
GRANT SELECT ON approved_sources TO anon;
GRANT SELECT ON psa_submissions TO authenticated;
GRANT ALL ON source_reviews TO authenticated;
GRANT ALL ON source_metadata TO authenticated;
