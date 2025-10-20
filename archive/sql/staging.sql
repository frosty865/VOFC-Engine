-- VOFC Staging Tables
-- These tables are used for temporary data import before processing into main tables

-- Drop existing staging tables if they exist (idempotent)
DROP TABLE IF EXISTS _staging_controls CASCADE;
DROP TABLE IF EXISTS _staging_ofc CASCADE;
DROP TABLE IF EXISTS _staging_assessments CASCADE;
DROP TABLE IF EXISTS _staging_links CASCADE;

-- Create staging table for controls
CREATE TABLE _staging_controls (
    id_old BIGINT,
    title TEXT,
    objective TEXT,
    resilience_function TEXT,
    version TEXT,
    is_deprecated BOOLEAN
);

-- Create staging table for OFCs
CREATE TABLE _staging_ofc (
    id_old BIGINT,
    ofc_code TEXT,
    description TEXT,
    effort_level TEXT,
    effectiveness TEXT,
    cost_band TEXT,
    time_to_implement TEXT,
    capability_gain TEXT,
    reference_sources TEXT,
    version TEXT
);

-- Create staging table for assessments
CREATE TABLE _staging_assessments (
    id_old BIGINT,
    question TEXT,
    readiness_state TEXT,
    mission_dependency TEXT,
    confidence_level TEXT,
    evidence_basis TEXT,
    vulnerability_detail TEXT,
    operational_consequence TEXT,
    cascading_effect TEXT,
    recommendation_summary TEXT,
    capability_gain TEXT,
    references_citations TEXT
);

-- Create staging table for links
CREATE TABLE _staging_links (
    assessment_id_old BIGINT,
    ofc_id_old BIGINT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staging_controls_id ON _staging_controls(id_old);
CREATE INDEX IF NOT EXISTS idx_staging_ofc_id ON _staging_ofc(id_old);
CREATE INDEX IF NOT EXISTS idx_staging_ofc_code ON _staging_ofc(ofc_code);
CREATE INDEX IF NOT EXISTS idx_staging_assessments_id ON _staging_assessments(id_old);
CREATE INDEX IF NOT EXISTS idx_staging_links_assessment ON _staging_links(assessment_id_old);
CREATE INDEX IF NOT EXISTS idx_staging_links_ofc ON _staging_links(ofc_id_old);

-- Add comments for documentation
COMMENT ON TABLE _staging_controls IS 'Staging table for control data before import to main tables';
COMMENT ON TABLE _staging_ofc IS 'Staging table for OFC data before import to main tables';
COMMENT ON TABLE _staging_assessments IS 'Staging table for assessment data before import to main tables';
COMMENT ON TABLE _staging_links IS 'Staging table for assessment-OFC links before import to main tables';

-- Create a function to clean staging tables
CREATE OR REPLACE FUNCTION clean_staging_tables()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE _staging_controls RESTART IDENTITY CASCADE;
    TRUNCATE TABLE _staging_ofc RESTART IDENTITY CASCADE;
    TRUNCATE TABLE _staging_assessments RESTART IDENTITY CASCADE;
    TRUNCATE TABLE _staging_links RESTART IDENTITY CASCADE;
    
    RAISE NOTICE 'All staging tables have been cleaned';
END;
$$ LANGUAGE plpgsql;

-- Create a function to get staging table statistics
CREATE OR REPLACE FUNCTION get_staging_stats()
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT '_staging_controls'::TEXT, COUNT(*)::BIGINT FROM _staging_controls
    UNION ALL
    SELECT '_staging_ofc'::TEXT, COUNT(*)::BIGINT FROM _staging_ofc
    UNION ALL
    SELECT '_staging_assessments'::TEXT, COUNT(*)::BIGINT FROM _staging_assessments
    UNION ALL
    SELECT '_staging_links'::TEXT, COUNT(*)::BIGINT FROM _staging_links;
END;
$$ LANGUAGE plpgsql;