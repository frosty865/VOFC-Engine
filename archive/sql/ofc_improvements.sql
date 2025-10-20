-- OFC Improvements and Data Quality Enhancements
-- This script applies post-migration improvements to the data

BEGIN;

-- 1. Deduplicate OFCs by ofc_code (keep the first occurrence)
CREATE OR REPLACE FUNCTION dedupe_ofcs()
RETURNS void AS $$
BEGIN
    -- Create a temporary table with deduplicated OFCs
    CREATE TEMP TABLE ofc_deduped AS
    SELECT DISTINCT ON (ofc_code)
        id, ofc_code, description, effort_level, effectiveness, cost_band,
        time_to_implement, capability_gain, reference_sources, version
    FROM ofc_option
    ORDER BY ofc_code, id;
    
    -- Clear the original table
    DELETE FROM ofc_option;
    
    -- Re-insert deduplicated data
    INSERT INTO ofc_option (id, ofc_code, description, effort_level, effectiveness, 
                           cost_band, time_to_implement, capability_gain, reference_sources, 
                           version)
    SELECT * FROM ofc_deduped;
    
    -- Update question_ofc_link to use the kept OFC IDs
    UPDATE question_ofc_link 
    SET ofc_id = (
        SELECT oo.id 
        FROM ofc_option oo 
        WHERE oo.ofc_code = (
            SELECT ofc_code 
            FROM ofc_option 
            WHERE id = question_ofc_link.ofc_id
        )
        ORDER BY id 
        LIMIT 1
    );
    
    RAISE NOTICE 'OFCs deduplicated';
END;
$$ LANGUAGE plpgsql;

-- 2. Backfill missing OFC codes with sequential numbering
CREATE OR REPLACE FUNCTION backfill_ofc_codes()
RETURNS void AS $$
DECLARE
    ofc_record RECORD;
    counter INTEGER := 1;
BEGIN
    -- Update OFCs that don't have proper codes
    FOR ofc_record IN 
        SELECT id FROM ofc_option 
        WHERE ofc_code IS NULL OR ofc_code = '' OR ofc_code NOT LIKE 'OFC%'
        ORDER BY id
    LOOP
        UPDATE ofc_option 
        SET ofc_code = 'OFC' || LPAD(counter::TEXT, 4, '0')
        WHERE id = ofc_record.id;
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'OFC codes backfilled';
END;
$$ LANGUAGE plpgsql;

-- 3. Create performance indexes
CREATE OR REPLACE FUNCTION create_performance_indexes()
RETURNS void AS $$
BEGIN
    -- Indexes for ofc_option
    CREATE INDEX IF NOT EXISTS idx_ofc_option_code ON ofc_option(ofc_code);
    CREATE INDEX IF NOT EXISTS idx_ofc_option_effectiveness ON ofc_option(effectiveness);
    CREATE INDEX IF NOT EXISTS idx_ofc_option_effort ON ofc_option(effort_level);
    
    -- Indexes for readiness_resilience_assessment
    CREATE INDEX IF NOT EXISTS idx_assessment_confidence ON readiness_resilience_assessment(confidence_level);
    CREATE INDEX IF NOT EXISTS idx_assessment_subsector ON readiness_resilience_assessment(subsector_id);
    
    -- Indexes for question_ofc_link
    CREATE INDEX IF NOT EXISTS idx_link_assessment ON question_ofc_link(assessment_id);
    CREATE INDEX IF NOT EXISTS idx_link_ofc ON question_ofc_link(ofc_id);
    
    -- Composite indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_ofc_effort_effectiveness ON ofc_option(effort_level, effectiveness);
    CREATE INDEX IF NOT EXISTS idx_assessment_subsector_confidence ON readiness_resilience_assessment(subsector_id, confidence_level);
    
    RAISE NOTICE 'Performance indexes created';
END;
$$ LANGUAGE plpgsql;

-- 4. Data quality improvements
CREATE OR REPLACE FUNCTION improve_data_quality()
RETURNS void AS $$
BEGIN
    -- Standardize effort levels
    UPDATE ofc_option 
    SET effort_level = CASE 
        WHEN LOWER(effort_level) IN ('low', 'l') THEN 'Low'
        WHEN LOWER(effort_level) IN ('medium', 'med', 'm') THEN 'Medium'
        WHEN LOWER(effort_level) IN ('high', 'h') THEN 'High'
        ELSE COALESCE(effort_level, 'Medium')
    END;
    
    -- Standardize effectiveness levels
    UPDATE ofc_option 
    SET effectiveness = CASE 
        WHEN LOWER(effectiveness) IN ('low', 'l') THEN 'Low'
        WHEN LOWER(effectiveness) IN ('medium', 'med', 'm') THEN 'Medium'
        WHEN LOWER(effectiveness) IN ('high', 'h') THEN 'High'
        ELSE COALESCE(effectiveness, 'Medium')
    END;
    
    -- Clean up capability_gain descriptions
    UPDATE ofc_option 
    SET capability_gain = TRIM(capability_gain)
    WHERE capability_gain IS NOT NULL;
    
    -- Ensure all assessments have proper confidence levels
    UPDATE readiness_resilience_assessment 
    SET confidence_level = 'Medium'::confidence_level
    WHERE confidence_level IS NULL;
    
    RAISE NOTICE 'Data quality improved';
END;
$$ LANGUAGE plpgsql;

-- 5. Create summary statistics
CREATE OR REPLACE FUNCTION create_summary_stats()
RETURNS TABLE(
    metric TEXT,
    value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Total Assessments'::TEXT, COUNT(*)::BIGINT FROM readiness_resilience_assessment
    UNION ALL
    SELECT 'Total OFCs'::TEXT, COUNT(*)::BIGINT FROM ofc_option
    UNION ALL
    SELECT 'Total Links'::TEXT, COUNT(*)::BIGINT FROM question_ofc_link
    UNION ALL
    SELECT 'Unique OFC Codes'::TEXT, COUNT(DISTINCT ofc_code)::BIGINT FROM ofc_option
    UNION ALL
    SELECT 'High Effectiveness OFCs'::TEXT, COUNT(*)::BIGINT FROM ofc_option WHERE effectiveness = 'High'
    UNION ALL
    SELECT 'Low Effort OFCs'::TEXT, COUNT(*)::BIGINT FROM ofc_option WHERE effort_level = 'Low'
    UNION ALL
    SELECT 'High Confidence Assessments'::TEXT, COUNT(*)::BIGINT FROM readiness_resilience_assessment WHERE confidence_level = 'High';
END;
$$ LANGUAGE plpgsql;

-- Execute all improvement functions
SELECT dedupe_ofcs();
SELECT backfill_ofc_codes();
SELECT create_performance_indexes();
SELECT improve_data_quality();

-- Display summary statistics
SELECT * FROM create_summary_stats();

COMMIT;
