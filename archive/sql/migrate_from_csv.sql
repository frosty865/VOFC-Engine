-- VOFC Data Migration from Staging to Main Tables
-- This script migrates data from staging tables to the main VOFC tables

BEGIN;

-- Create unique index if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_control_objective_title_uniq ON control_objective(title);

-- Create mapping tables for tracking old to new IDs
CREATE TEMP TABLE IF NOT EXISTS _map_controls (
    old_id BIGINT,
    new_id UUID
);

CREATE TEMP TABLE IF NOT EXISTS _map_ofc (
    old_id BIGINT,
    new_id UUID
);

-- Function to upsert control_objective
CREATE OR REPLACE FUNCTION upsert_control_objective()
RETURNS void AS $$
BEGIN
    -- Upsert control_objective by title from _staging_controls
    INSERT INTO control_objective (title, objective, resilience_function, version, is_deprecated)
    SELECT DISTINCT
        title,
        objective,
        resilience_function::resilience_function,
        COALESCE(version, '1.0'),
        COALESCE(is_deprecated, FALSE)
    FROM _staging_controls
    WHERE title IS NOT NULL
    ON CONFLICT (title) DO UPDATE SET
        objective = EXCLUDED.objective,
        resilience_function = EXCLUDED.resilience_function,
        version = EXCLUDED.version,
        is_deprecated = EXCLUDED.is_deprecated;
    
    -- Record mapping
    INSERT INTO _map_controls (old_id, new_id)
    SELECT 
        sc.id_old,
        co.id
    FROM _staging_controls sc
    JOIN control_objective co ON sc.title = co.title;
    
    RAISE NOTICE 'Control objectives upserted and mapped';
END;
$$ LANGUAGE plpgsql;

-- Function to upsert ofc_option
CREATE OR REPLACE FUNCTION upsert_ofc_option()
RETURNS void AS $$
BEGIN
    -- Upsert ofc_option by ofc_code from _staging_ofc
    INSERT INTO ofc_option (ofc_code, description, effort_level, effectiveness, cost_band, time_to_implement, capability_gain, reference_sources, version)
    SELECT DISTINCT
        ofc_code,
        description,
        COALESCE(effort_level, ''),
        COALESCE(effectiveness, ''),
        COALESCE(cost_band, ''),
        COALESCE(time_to_implement, ''),
        COALESCE(capability_gain, ''),
        COALESCE(reference_sources, ''),
        COALESCE(version, '1.0')
    FROM _staging_ofc
    WHERE ofc_code IS NOT NULL
    ON CONFLICT (ofc_code) DO UPDATE SET
        description = EXCLUDED.description,
        effort_level = EXCLUDED.effort_level,
        effectiveness = EXCLUDED.effectiveness,
        cost_band = EXCLUDED.cost_band,
        time_to_implement = EXCLUDED.time_to_implement,
        capability_gain = EXCLUDED.capability_gain,
        reference_sources = EXCLUDED.reference_sources,
        version = EXCLUDED.version;
    
    -- Record mapping
    INSERT INTO _map_ofc (old_id, new_id)
    SELECT 
        so.id_old,
        oo.id
    FROM _staging_ofc so
    JOIN ofc_option oo ON so.ofc_code = oo.ofc_code;
    
    RAISE NOTICE 'OFC options upserted and mapped';
END;
$$ LANGUAGE plpgsql;

-- Function to insert readiness_resilience_assessment
CREATE OR REPLACE FUNCTION insert_readiness_assessments()
RETURNS void AS $$
BEGIN
    -- Insert into readiness_resilience_assessment from _staging_assessments
    INSERT INTO readiness_resilience_assessment (
        question,
        readiness_state,
        mission_dependency,
        confidence_level,
        evidence_basis,
        vulnerability_detail,
        operational_consequence,
        cascading_effect,
        recommendation_summary,
        capability_gain,
        references_citations,
        subsector_id,
        parameter_profile_id
    )
    SELECT 
        question,
        CASE 
            WHEN readiness_state = '' OR readiness_state IS NULL THEN 'Not Implemented'::readiness_state
            ELSE readiness_state::readiness_state
        END,
        CASE 
            WHEN mission_dependency = '' OR mission_dependency IS NULL THEN 'Core'::mission_dependency
            ELSE mission_dependency::mission_dependency
        END,
        -- Coerce confidence_level to enum (assuming values like 'Low', 'Medium', 'High')
        CASE 
            WHEN confidence_level IN ('Low', 'Medium', 'High') THEN confidence_level::confidence_level
            ELSE 'Medium'::confidence_level
        END,
        COALESCE(evidence_basis, ''),
        COALESCE(vulnerability_detail, ''),
        COALESCE(operational_consequence, ''),
        COALESCE(cascading_effect, ''),
        COALESCE(recommendation_summary, ''),
        COALESCE(capability_gain, ''),
        COALESCE(references_citations, ''),
        '3e8804d6-20ae-49a8-a921-5f32c49cc5db'::uuid, -- Hotels & Lodging subsector_id
        'd1d00e46-d10a-4586-8c9b-a84a30d99d8a'::uuid -- Default – Hotels & Lodging parameter_profile_id
    FROM _staging_assessments
    WHERE question IS NOT NULL;
    
    RAISE NOTICE 'Readiness assessments inserted';
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild question_ofc_link using maps
CREATE OR REPLACE FUNCTION rebuild_question_ofc_links()
RETURNS void AS $$
BEGIN
    -- Clear existing links
    DELETE FROM question_ofc_link;
    
    -- Rebuild links using the maps
    INSERT INTO question_ofc_link (assessment_id, ofc_id)
    SELECT 
        rra.id,
        oo.id
    FROM _staging_links sl
    JOIN _map_assessments ma ON sl.assessment_id_old = ma.old_id
    JOIN readiness_resilience_assessment rra ON ma.new_id = rra.id
    JOIN _map_ofc mo ON sl.ofc_id_old = mo.old_id
    JOIN ofc_option oo ON mo.new_id = oo.id;
    
    RAISE NOTICE 'Question-OFC links rebuilt';
END;
$$ LANGUAGE plpgsql;

-- Create assessment mapping table
CREATE TEMP TABLE IF NOT EXISTS _map_assessments (
    old_id BIGINT,
    new_id UUID
);

-- Function to map assessments
CREATE OR REPLACE FUNCTION map_assessments()
RETURNS void AS $$
BEGIN
    -- Map assessments by question (assuming questions are unique)
    INSERT INTO _map_assessments (old_id, new_id)
    SELECT 
        sa.id_old,
        rra.id
    FROM _staging_assessments sa
    JOIN readiness_resilience_assessment rra ON sa.question = rra.question;
    
    RAISE NOTICE 'Assessments mapped';
END;
$$ LANGUAGE plpgsql;

-- Execute migration functions
SELECT upsert_control_objective();
SELECT upsert_ofc_option();
SELECT insert_readiness_assessments();
SELECT map_assessments();
SELECT rebuild_question_ofc_links();

-- Verification queries
SELECT 'Control Objectives' as table_name, COUNT(*) as count FROM control_objective
UNION ALL
SELECT 'OFC Options' as table_name, COUNT(*) as count FROM ofc_option
UNION ALL
SELECT 'Readiness Assessments' as table_name, COUNT(*) as count FROM readiness_resilience_assessment
UNION ALL
SELECT 'Question-OFC Links' as table_name, COUNT(*) as count FROM question_ofc_link;

COMMIT;