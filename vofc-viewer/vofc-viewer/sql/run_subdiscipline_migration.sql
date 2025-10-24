-- Complete Sub-discipline Migration Script
-- This script runs the complete migration to add sub-disciplines support

-- Step 1: Add the sub-discipline schema
\i add_subdisciplines_schema.sql

-- Step 2: Run the data migration
\i migrate_existing_data_to_subdisciplines.sql

-- Step 3: Run the migration functions
DO $$
DECLARE
    result JSON;
BEGIN
    -- Assign sub-disciplines based on content
    SELECT assign_subdisciplines_by_content() INTO result;
    RAISE NOTICE 'Content-based assignment result: %', result;
    
    -- Update submission tables
    SELECT update_submission_tables_subdisciplines() INTO result;
    RAISE NOTICE 'Submission tables update result: %', result;
    
    -- Get migration statistics
    SELECT get_subdiscipline_migration_stats() INTO result;
    RAISE NOTICE 'Migration statistics: %', result;
END $$;

-- Step 4: Create updated views that include sub-disciplines
CREATE OR REPLACE VIEW vulnerabilities_with_disciplines AS
SELECT 
    v.id,
    v.vulnerability,
    v.discipline,
    d.name as discipline_name,
    d.description as discipline_description,
    d.category as discipline_category,
    sd.name as sub_discipline_name,
    sd.description as sub_discipline_description,
    CASE 
        WHEN sd.name IS NOT NULL THEN d.name || ' - ' || sd.name
        ELSE d.name
    END as full_discipline_name,
    v.source,
    v.source_title,
    v.source_url,
    v.created_at,
    v.updated_at
FROM vulnerabilities v
LEFT JOIN disciplines d ON v.discipline_id = d.id
LEFT JOIN sub_disciplines sd ON v.sub_discipline_id = sd.id
ORDER BY v.created_at DESC;

CREATE OR REPLACE VIEW ofcs_with_disciplines AS
SELECT 
    o.id,
    o.option_text,
    o.discipline,
    d.name as discipline_name,
    d.description as discipline_description,
    d.category as discipline_category,
    sd.name as sub_discipline_name,
    sd.description as sub_discipline_description,
    CASE 
        WHEN sd.name IS NOT NULL THEN d.name || ' - ' || sd.name
        ELSE d.name
    END as full_discipline_name,
    o.vulnerability_id,
    o.source,
    o.source_title,
    o.source_url,
    o.confidence_score,
    o.created_at,
    o.updated_at
FROM options_for_consideration o
LEFT JOIN disciplines d ON o.discipline_id = d.id
LEFT JOIN sub_disciplines sd ON o.sub_discipline_id = sd.id
ORDER BY o.created_at DESC;

-- Step 5: Create function to get Physical Security sub-disciplines for the frontend
CREATE OR REPLACE FUNCTION get_physical_security_subdisciplines()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', sd.id,
            'name', sd.name,
            'description', sd.description
        )
    ) INTO result
    FROM sub_disciplines sd
    JOIN disciplines d ON sd.discipline_id = d.id
    WHERE d.name = 'Physical Security'
    AND sd.is_active = true
    ORDER BY sd.name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to get all disciplines with sub-disciplines for frontend
CREATE OR REPLACE FUNCTION get_all_disciplines_for_frontend()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'name', d.name,
            'subdisciplines', CASE 
                WHEN COUNT(sd.id) > 0 THEN json_agg(
                    json_build_object(
                        'name', sd.name,
                        'description', sd.description
                    )
                ) FILTER (WHERE sd.id IS NOT NULL)
                ELSE json_build_array()
            END
        )
    ) INTO result
    FROM disciplines d
    LEFT JOIN sub_disciplines sd ON d.id = sd.discipline_id AND sd.is_active = true
    WHERE d.is_active = true
    GROUP BY d.id, d.name, d.description, d.category
    ORDER BY d.name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update the submission API to handle sub-disciplines
-- This will be handled in the backend API code, but we ensure the database is ready

-- Step 8: Create indexes for better performance with sub-disciplines
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discipline_subdiscipline 
ON vulnerabilities(discipline_id, sub_discipline_id);

CREATE INDEX IF NOT EXISTS idx_ofcs_discipline_subdiscipline 
ON options_for_consideration(discipline_id, sub_discipline_id);

CREATE INDEX IF NOT EXISTS idx_submission_vulns_discipline_subdiscipline 
ON submission_vulnerabilities(discipline_id, sub_discipline_id);

CREATE INDEX IF NOT EXISTS idx_submission_ofcs_discipline_subdiscipline 
ON submission_options_for_consideration(discipline_id, sub_discipline_id);

-- Step 9: Create function to validate discipline and sub-discipline combinations
CREATE OR REPLACE FUNCTION validate_discipline_subdiscipline(
    discipline_name TEXT,
    sub_discipline_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    discipline_exists BOOLEAN := FALSE;
    sub_discipline_exists BOOLEAN := TRUE; -- Default to true if no sub-discipline provided
BEGIN
    -- Check if discipline exists
    SELECT EXISTS(
        SELECT 1 FROM disciplines 
        WHERE name = discipline_name AND is_active = true
    ) INTO discipline_exists;
    
    -- If sub-discipline is provided, check if it exists and belongs to the discipline
    IF sub_discipline_name IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM sub_disciplines sd
            JOIN disciplines d ON sd.discipline_id = d.id
            WHERE d.name = discipline_name 
            AND sd.name = sub_discipline_name 
            AND sd.is_active = true
        ) INTO sub_discipline_exists;
    END IF;
    
    RETURN discipline_exists AND sub_discipline_exists;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Final verification and reporting
DO $$
DECLARE
    stats JSON;
    physical_security_count INTEGER;
    sub_discipline_count INTEGER;
BEGIN
    -- Get final statistics
    SELECT get_subdiscipline_migration_stats() INTO stats;
    RAISE NOTICE 'Final migration statistics: %', stats;
    
    -- Check Physical Security sub-disciplines
    SELECT COUNT(*) INTO physical_security_count
    FROM sub_disciplines sd
    JOIN disciplines d ON sd.discipline_id = d.id
    WHERE d.name = 'Physical Security';
    
    SELECT COUNT(*) INTO sub_discipline_count
    FROM sub_disciplines;
    
    RAISE NOTICE 'Physical Security sub-disciplines created: %', physical_security_count;
    RAISE NOTICE 'Total sub-disciplines in database: %', sub_discipline_count;
    
    IF physical_security_count = 9 THEN
        RAISE NOTICE 'SUCCESS: All 9 Physical Security sub-disciplines created successfully!';
    ELSE
        RAISE WARNING 'WARNING: Expected 9 Physical Security sub-disciplines, found %', physical_security_count;
    END IF;
END $$;

-- Step 11: Create a rollback function (for safety)
CREATE OR REPLACE FUNCTION rollback_subdiscipline_migration()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Remove sub_discipline_id columns (this will fail if there are foreign key constraints)
    -- ALTER TABLE vulnerabilities DROP COLUMN IF EXISTS sub_discipline_id;
    -- ALTER TABLE options_for_consideration DROP COLUMN IF EXISTS sub_discipline_id;
    -- ALTER TABLE submission_vulnerabilities DROP COLUMN IF EXISTS sub_discipline_id;
    -- ALTER TABLE submission_options_for_consideration DROP COLUMN IF EXISTS sub_discipline_id;
    
    -- Drop the sub_disciplines table
    -- DROP TABLE IF EXISTS sub_disciplines CASCADE;
    
    result := json_build_object(
        'success', true,
        'message', 'Rollback function created (commented out for safety)',
        'warning', 'Manual rollback required - uncomment the DROP statements if needed'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

