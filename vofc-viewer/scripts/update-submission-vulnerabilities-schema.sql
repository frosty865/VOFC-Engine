-- Migration: Update submission_vulnerabilities table schema
-- Run this in Supabase SQL Editor
-- This ensures all required columns exist for the VOFC Engine

-- Step 1: Add missing basic columns if they don't exist
DO $$ 
BEGIN
  -- Add title column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN title text;
    COMMENT ON COLUMN public.submission_vulnerabilities.title IS 'Vulnerability statement or title';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN description text;
    COMMENT ON COLUMN public.submission_vulnerabilities.description IS 'Full vulnerability description including question, statement, what, and so_what';
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN category varchar(256);
    COMMENT ON COLUMN public.submission_vulnerabilities.category IS 'Vulnerability category classification';
  END IF;

  -- Add severity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN severity varchar(64);
    COMMENT ON COLUMN public.submission_vulnerabilities.severity IS 'Vulnerability severity level';
  END IF;
END $$;

-- Step 2: Add structured vulnerability columns if they don't exist
DO $$ 
BEGIN
  -- Add question column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'question'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN question text;
    COMMENT ON COLUMN public.submission_vulnerabilities.question IS 'Assessment question in proper question format (e.g., "Are there adequate...?")';
  END IF;

  -- Add what column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'what'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN what text;
    COMMENT ON COLUMN public.submission_vulnerabilities.what IS 'Clear description of the vulnerability in sentence format';
  END IF;

  -- Add so_what column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'so_what'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN so_what text;
    COMMENT ON COLUMN public.submission_vulnerabilities.so_what IS 'Impact, consequence, or risk if this vulnerability is not addressed';
  END IF;

  -- Add sector column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'sector'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN sector varchar(256);
    COMMENT ON COLUMN public.submission_vulnerabilities.sector IS 'Primary sector (e.g., Education, Healthcare, Energy, Government Facilities, Transportation, Water)';
  END IF;

  -- Add subsector column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'subsector'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN subsector varchar(256);
    COMMENT ON COLUMN public.submission_vulnerabilities.subsector IS 'Specific subsector within the sector (e.g., K-12 Schools, Hospitals, Power Generation, Federal Buildings)';
  END IF;

  -- Add discipline column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'submission_vulnerabilities' AND column_name = 'discipline'
  ) THEN
    ALTER TABLE public.submission_vulnerabilities ADD COLUMN discipline varchar(256);
    COMMENT ON COLUMN public.submission_vulnerabilities.discipline IS 'Security discipline (Security Management, Physical Security, Entry Controls, VSS, Security Force, Information Sharing, Resilience, Training)';
  END IF;
END $$;

-- Step 3: Update vulnerability column to work with title/description
-- The table has 'vulnerability' (NOT NULL) column - we'll keep it and use title/description for new structure
DO $$ 
BEGIN
  -- If title is empty but vulnerability has data, copy it
  UPDATE public.submission_vulnerabilities 
  SET title = vulnerability 
  WHERE (title IS NULL OR title = '') AND vulnerability IS NOT NULL AND vulnerability != '';
  
  -- If description is empty but vulnerability has data, use it as description
  UPDATE public.submission_vulnerabilities 
  SET description = vulnerability 
  WHERE (description IS NULL OR description = '') AND vulnerability IS NOT NULL AND vulnerability != '';
END $$;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_sector ON public.submission_vulnerabilities(sector);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_subsector ON public.submission_vulnerabilities(subsector);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_discipline ON public.submission_vulnerabilities(discipline) WHERE discipline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_question ON public.submission_vulnerabilities USING gin(to_tsvector('english', question)) WHERE question IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_category ON public.submission_vulnerabilities(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_submission_id ON public.submission_vulnerabilities(submission_id);

-- Step 5: Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'submission_vulnerabilities'
ORDER BY ordinal_position;

