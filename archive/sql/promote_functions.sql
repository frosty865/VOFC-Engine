-- Promotion Functions for VOFC Staging System
-- These functions handle promoting validated records to production

-- Function to promote validated records to production
CREATE OR REPLACE FUNCTION promote_validated_records(
    p_validator TEXT DEFAULT 'System',
    p_comments TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    promoted_questions INTEGER,
    promoted_vulnerabilities INTEGER,
    promoted_ofcs INTEGER,
    relationships_created INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    question_count INTEGER := 0;
    vulnerability_count INTEGER := 0;
    ofc_count INTEGER := 0;
    relationship_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
    rec RECORD;
    question_rec RECORD;
    ofc_rec RECORD;
BEGIN
    -- Promote Questions
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
            
            -- Log the promotion
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'promote',
                'Promoted to production',
                'Successfully promoted to questions table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'Question promotion error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Promote Vulnerabilities
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
            
            -- Log the promotion
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'promote',
                'Promoted to production',
                'Successfully promoted to vulnerabilities table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'Vulnerability promotion error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Promote OFCs
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
            
            -- Log the promotion
            INSERT INTO validation_log (
                staging_record_id,
                validation_action,
                new_status,
                validation_notes
            ) VALUES (
                rec.id,
                'promote',
                'Promoted to production',
                'Successfully promoted to ofcs table'
            );
            
        EXCEPTION WHEN OTHERS THEN
            error_list := array_append(error_list, 'OFC promotion error: ' || SQLERRM);
        END;
    END LOOP;
    
    -- Create relationships between promoted records
    FOR question_rec IN 
        SELECT q.question_id, q.source_doc, q.page_number
        FROM questions q
        WHERE q.source_doc IS NOT NULL
        AND q.created_at > NOW() - INTERVAL '1 hour' -- Only recent promotions
    LOOP
        FOR ofc_rec IN 
            SELECT o.ofc_id, o.source_doc, o.page_number
            FROM ofcs o
            WHERE o.source_doc = question_rec.source_doc
            AND ABS(o.page_number - question_rec.page_number) <= 2 -- Within 2 pages
            AND o.created_at > NOW() - INTERVAL '1 hour' -- Only recent promotions
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
    
    -- Update staging records to mark as promoted
    UPDATE staging_vofc_records 
    SET validation_status = 'Migrated',
        updated_at = NOW()
    WHERE validation_status = 'Validated';
    
    RETURN QUERY SELECT 
        true as success,
        'Promotion completed successfully' as message,
        question_count as promoted_questions,
        vulnerability_count as promoted_vulnerabilities,
        ofc_count as promoted_ofcs,
        relationship_count as relationships_created,
        error_list as errors;
        
END;
$$ LANGUAGE plpgsql;

-- Function to get promotion statistics
CREATE OR REPLACE FUNCTION get_promotion_stats()
RETURNS TABLE (
    total_validated INTEGER,
    questions_ready INTEGER,
    vulnerabilities_ready INTEGER,
    ofcs_ready INTEGER,
    last_promotion TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE validation_status = 'Validated')::INTEGER as total_validated,
        COUNT(*) FILTER (WHERE record_type = 'Question' AND validation_status = 'Validated')::INTEGER as questions_ready,
        COUNT(*) FILTER (WHERE record_type = 'Vulnerability' AND validation_status = 'Validated')::INTEGER as vulnerabilities_ready,
        COUNT(*) FILTER (WHERE record_type = 'OFC' AND validation_status = 'Validated')::INTEGER as ofcs_ready,
        MAX(updated_at) FILTER (WHERE validation_status = 'Migrated') as last_promotion
    FROM staging_vofc_records;
END;
$$ LANGUAGE plpgsql;

-- Function to preview promotion (what would be promoted)
CREATE OR REPLACE FUNCTION preview_promotion()
RETURNS TABLE (
    record_type TEXT,
    count INTEGER,
    sample_text TEXT,
    source_docs TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.record_type,
        COUNT(*)::INTEGER as count,
        (array_agg(sr.record_text))[1] as sample_text,
        array_agg(DISTINCT sr.source_doc) as source_docs
    FROM staging_vofc_records sr
    WHERE sr.validation_status = 'Validated'
    GROUP BY sr.record_type
    ORDER BY sr.record_type;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION promote_validated_records TO authenticated;
GRANT EXECUTE ON FUNCTION get_promotion_stats TO authenticated;
GRANT EXECUTE ON FUNCTION preview_promotion TO authenticated;
