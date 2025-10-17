-- Migration script to move validated staging records to production tables
-- This script handles the flow: staging_vofc_records -> production tables

-- Function to migrate validated records to production
CREATE OR REPLACE FUNCTION migrate_validated_records()
RETURNS TABLE (
    migrated_questions INTEGER,
    migrated_vulnerabilities INTEGER,
    migrated_ofcs INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    question_count INTEGER := 0;
    vulnerability_count INTEGER := 0;
    ofc_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
    rec RECORD;
BEGIN
    -- Migrate Questions
    FOR rec IN 
        SELECT id, record_text, source_doc, page_number, confidence_score
        FROM staging_vofc_records 
        WHERE record_type = 'Question' 
        AND validation_status = 'Validated'
    LOOP
        BEGIN
            INSERT INTO questions (
                question_text,
                sector_id, -- Default to General sector
                technology_class,
                source_doc,
                page_number,
                confidence_score,
                created_at
            ) VALUES (
                rec.record_text,
                1, -- General sector
                'General', -- Default technology class
                rec.source_doc,
                rec.page_number,
                rec.confidence_score,
                NOW()
            );
            
            question_count := question_count + 1;
            
            -- Log the migration
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'migrate',
                'Migrated to production',
                'Successfully migrated to questions table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'Question migration error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Migrate Vulnerabilities
    FOR rec IN 
        SELECT id, record_text, source_doc, page_number, confidence_score
        FROM staging_vofc_records 
        WHERE record_type = 'Vulnerability' 
        AND validation_status = 'Validated'
    LOOP
        BEGIN
            INSERT INTO vulnerabilities (
                vulnerability_name,
                description,
                source_doc,
                page_number,
                confidence_score,
                created_at
            ) VALUES (
                LEFT(rec.record_text, 200), -- Truncate for name field
                rec.record_text,
                rec.source_doc,
                rec.page_number,
                rec.confidence_score,
                NOW()
            );
            
            vulnerability_count := vulnerability_count + 1;
            
            -- Log the migration
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'migrate',
                'Migrated to production',
                'Successfully migrated to vulnerabilities table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'Vulnerability migration error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Migrate OFCs
    FOR rec IN 
        SELECT id, record_text, source_doc, page_number, confidence_score
        FROM staging_vofc_records 
        WHERE record_type = 'OFC' 
        AND validation_status = 'Validated'
    LOOP
        BEGIN
            INSERT INTO ofcs (
                ofc_text,
                technology_class,
                source_doc,
                page_number,
                effort_level,
                effectiveness,
                confidence_score,
                created_at
            ) VALUES (
                rec.record_text,
                'General', -- Default technology class
                rec.source_doc,
                rec.page_number,
                'Medium', -- Default effort level
                'High', -- Default effectiveness
                rec.confidence_score,
                NOW()
            );
            
            ofc_count := ofc_count + 1;
            
            -- Log the migration
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'migrate',
                'Migrated to production',
                'Successfully migrated to ofcs table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'OFC migration error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Update staging records to mark as migrated
    UPDATE staging_vofc_records 
    SET validation_status = 'Migrated',
        updated_at = NOW()
    WHERE validation_status = 'Validated';
    
    RETURN QUERY SELECT 
        question_count,
        vulnerability_count,
        ofc_count,
        error_list;
        
END;
$$ LANGUAGE plpgsql;

-- Function to create relationships between migrated records
CREATE OR REPLACE FUNCTION create_record_relationships()
RETURNS TABLE (
    relationships_created INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    relationship_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
    question_rec RECORD;
    ofc_rec RECORD;
BEGIN
    -- Create question-OFC relationships based on source document and page proximity
    FOR question_rec IN 
        SELECT q.question_id, q.source_doc, q.page_number
        FROM questions q
        WHERE q.source_doc IS NOT NULL
        AND q.created_at > NOW() - INTERVAL '1 hour' -- Only recent migrations
    LOOP
        FOR ofc_rec IN 
            SELECT o.ofc_id, o.source_doc, o.page_number
            FROM ofcs o
            WHERE o.source_doc = question_rec.source_doc
            AND ABS(o.page_number - question_rec.page_number) <= 2 -- Within 2 pages
            AND o.created_at > NOW() - INTERVAL '1 hour' -- Only recent migrations
        LOOP
            BEGIN
                INSERT INTO question_ofc_map (question_id, ofc_id, created_at)
                VALUES (question_rec.question_id, ofc_rec.ofc_id, NOW())
                ON CONFLICT (question_id, ofc_id) DO NOTHING;
                
                relationship_count := relationship_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                error_list := array_append(error_list, 'Relationship creation error: ' || SQLERRM);
            END;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT 
        relationship_count,
        error_list;
        
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM migrate_validated_records();
-- SELECT * FROM create_record_relationships();
