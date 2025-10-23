-- Migrate Existing Data to Sub-disciplines
-- This script migrates existing data to use the new sub-discipline structure

-- 1. First, ensure all Physical Security records have the correct discipline_id
UPDATE vulnerabilities 
SET discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
WHERE discipline = 'Physical Security' 
AND discipline_id IS NULL;

UPDATE options_for_consideration 
SET discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
WHERE discipline = 'Physical Security' 
AND discipline_id IS NULL;

-- 2. Update submission tables as well
UPDATE submission_vulnerabilities 
SET discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
WHERE discipline = 'Physical Security' 
AND discipline_id IS NULL;

UPDATE submission_options_for_consideration 
SET discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
WHERE discipline = 'Physical Security' 
AND discipline_id IS NULL;

-- 3. Create a function to intelligently assign sub-disciplines based on content
CREATE OR REPLACE FUNCTION assign_subdisciplines_by_content()
RETURNS JSON AS $$
DECLARE
    result JSON;
    record_count INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    -- Update vulnerabilities based on content keywords
    -- Barriers and Fencing
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Barriers and Fencing'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%fence%' OR
        LOWER(vulnerability) LIKE '%barrier%' OR
        LOWER(vulnerability) LIKE '%gate%' OR
        LOWER(vulnerability) LIKE '%perimeter%' OR
        LOWER(vulnerability) LIKE '%boundary%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Electronic Security Systems
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Electronic Security Systems'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%electronic%' OR
        LOWER(vulnerability) LIKE '%alarm%' OR
        LOWER(vulnerability) LIKE '%sensor%' OR
        LOWER(vulnerability) LIKE '%detector%' OR
        LOWER(vulnerability) LIKE '%system%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Video Security Systems
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Video Security Systems'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%camera%' OR
        LOWER(vulnerability) LIKE '%video%' OR
        LOWER(vulnerability) LIKE '%cctv%' OR
        LOWER(vulnerability) LIKE '%surveillance%' OR
        LOWER(vulnerability) LIKE '%monitoring%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Access Control Systems
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Access Control Systems'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%access control%' OR
        LOWER(vulnerability) LIKE '%card reader%' OR
        LOWER(vulnerability) LIKE '%biometric%' OR
        LOWER(vulnerability) LIKE '%keypad%' OR
        LOWER(vulnerability) LIKE '%badge%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Intrusion Detection Systems
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Intrusion Detection Systems'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%intrusion%' OR
        LOWER(vulnerability) LIKE '%motion%' OR
        LOWER(vulnerability) LIKE '%glass break%' OR
        LOWER(vulnerability) LIKE '%detection%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Security Lighting
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Security Lighting'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%lighting%' OR
        LOWER(vulnerability) LIKE '%illumination%' OR
        LOWER(vulnerability) LIKE '%light%' OR
        LOWER(vulnerability) LIKE '%emergency lighting%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Security Hardware
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Security Hardware'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL
    AND (
        LOWER(vulnerability) LIKE '%lock%' OR
        LOWER(vulnerability) LIKE '%hardware%' OR
        LOWER(vulnerability) LIKE '%device%' OR
        LOWER(vulnerability) LIKE '%equipment%'
    );
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Default remaining Physical Security records to Physical Barriers
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Physical Barriers'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    -- Do the same for options_for_consideration
    -- (Similar logic but for OFCs)
    UPDATE options_for_consideration 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Physical Barriers'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    total_updated := total_updated + record_count;
    
    result := json_build_object(
        'success', true,
        'message', 'Sub-disciplines assigned based on content analysis',
        'total_updated', total_updated
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to update submission tables
CREATE OR REPLACE FUNCTION update_submission_tables_subdisciplines()
RETURNS JSON AS $$
DECLARE
    result JSON;
    record_count INTEGER := 0;
BEGIN
    -- Update submission_vulnerabilities
    UPDATE submission_vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Physical Barriers'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    
    -- Update submission_options_for_consideration
    UPDATE submission_options_for_consideration 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE name = 'Physical Barriers'
        AND discipline_id = (SELECT id FROM disciplines WHERE name = 'Physical Security')
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    result := json_build_object(
        'success', true,
        'message', 'Submission tables updated with sub-disciplines',
        'vulnerabilities_updated', record_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get statistics about the migration
CREATE OR REPLACE FUNCTION get_subdiscipline_migration_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_vulnerabilities INTEGER;
    total_ofcs INTEGER;
    physical_security_vulns INTEGER;
    physical_security_ofcs INTEGER;
    with_subdisciplines_vulns INTEGER;
    with_subdisciplines_ofcs INTEGER;
BEGIN
    -- Get total counts
    SELECT COUNT(*) INTO total_vulnerabilities FROM vulnerabilities;
    SELECT COUNT(*) INTO total_ofcs FROM options_for_consideration;
    
    -- Get Physical Security counts
    SELECT COUNT(*) INTO physical_security_vulns 
    FROM vulnerabilities 
    WHERE discipline = 'Physical Security';
    
    SELECT COUNT(*) INTO physical_security_ofcs 
    FROM options_for_consideration 
    WHERE discipline = 'Physical Security';
    
    -- Get counts with sub-disciplines
    SELECT COUNT(*) INTO with_subdisciplines_vulns 
    FROM vulnerabilities 
    WHERE sub_discipline_id IS NOT NULL;
    
    SELECT COUNT(*) INTO with_subdisciplines_ofcs 
    FROM options_for_consideration 
    WHERE sub_discipline_id IS NOT NULL;
    
    result := json_build_object(
        'total_vulnerabilities', total_vulnerabilities,
        'total_ofcs', total_ofcs,
        'physical_security_vulnerabilities', physical_security_vulns,
        'physical_security_ofcs', physical_security_ofcs,
        'vulnerabilities_with_subdisciplines', with_subdisciplines_vulns,
        'ofcs_with_subdisciplines', with_subdisciplines_ofcs,
        'migration_progress', CASE 
            WHEN total_vulnerabilities > 0 THEN 
                ROUND((with_subdisciplines_vulns::DECIMAL / total_vulnerabilities) * 100, 2)
            ELSE 0
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

