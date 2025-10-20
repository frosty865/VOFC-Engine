-- Validation Functions for VOFC Staging System
-- These functions handle validation status updates and logging

-- Function to update validation status with logging
CREATE OR REPLACE FUNCTION update_validation_status(
    p_record_id UUID,
    p_new_status TEXT,
    p_validator TEXT DEFAULT 'System',
    p_comments TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    record_id UUID,
    old_status TEXT,
    new_status TEXT
) AS $$
DECLARE
    v_old_status TEXT;
    v_record_exists BOOLEAN;
BEGIN
    -- Check if record exists
    SELECT EXISTS(SELECT 1 FROM staging_vofc_records WHERE id = p_record_id) INTO v_record_exists;
    
    IF NOT v_record_exists THEN
        RETURN QUERY SELECT 
            false as success,
            'Record not found' as message,
            p_record_id as record_id,
            NULL::TEXT as old_status,
            p_new_status as new_status;
        RETURN;
    END IF;
    
    -- Get current status
    SELECT validation_status INTO v_old_status 
    FROM staging_vofc_records 
    WHERE id = p_record_id;
    
    -- Validate status transition
    IF v_old_status = 'Migrated' THEN
        RETURN QUERY SELECT 
            false as success,
            'Cannot modify migrated records' as message,
            p_record_id as record_id,
            v_old_status as old_status,
            p_new_status as new_status;
        RETURN;
    END IF;
    
    -- Update the record
    UPDATE staging_vofc_records 
    SET 
        validation_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_record_id;
    
    -- Log the validation action using the new format
    INSERT INTO validation_log (
        staging_record_id,
        validator_id,
        validation_action,
        previous_status,
        new_status,
        validation_notes,
        validation_timestamp
    ) VALUES (
        p_record_id,
        p_validator, -- Now accepts TEXT for validator name
        CASE 
            WHEN p_new_status = 'Validated' THEN 'Validate'
            WHEN p_new_status = 'Rejected' THEN 'Reject'
            ELSE 'Modify'
        END,
        v_old_status,
        p_new_status,
        p_comments,
        NOW()
    );
    
    -- Return success
    RETURN QUERY SELECT 
        true as success,
        'Status updated successfully' as message,
        p_record_id as record_id,
        v_old_status as old_status,
        p_new_status as new_status;
        
END;
$$ LANGUAGE plpgsql;

-- Function to get validation history for a record
CREATE OR REPLACE FUNCTION get_validation_history(p_record_id UUID)
RETURNS TABLE (
    validation_id UUID,
    validator_id UUID,
    action TEXT,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.id as validation_id,
        vl.validator_id,
        vl.validation_action as action,
        vl.previous_status,
        vl.new_status,
        vl.validation_notes as notes,
        vl.validation_timestamp as timestamp
    FROM validation_log vl
    WHERE vl.staging_record_id = p_record_id
    ORDER BY vl.validation_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk update validation status
CREATE OR REPLACE FUNCTION bulk_update_validation_status(
    p_record_ids UUID[],
    p_new_status TEXT,
    p_validator TEXT DEFAULT 'System',
    p_comments TEXT DEFAULT NULL
)
RETURNS TABLE (
    success_count INTEGER,
    failure_count INTEGER,
    results JSONB
) AS $$
DECLARE
    v_record_id UUID;
    v_success_count INTEGER := 0;
    v_failure_count INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
    v_result JSONB;
BEGIN
    -- Process each record
    FOREACH v_record_id IN ARRAY p_record_ids
    LOOP
        BEGIN
            -- Call the single update function
            SELECT * INTO v_result FROM update_validation_status(
                v_record_id, 
                p_new_status, 
                p_validator, 
                p_comments
            );
            
            -- Check if successful
            IF (v_result->>'success')::BOOLEAN THEN
                v_success_count := v_success_count + 1;
            ELSE
                v_failure_count := v_failure_count + 1;
            END IF;
            
            -- Add to results
            v_results := v_results || v_result;
            
        EXCEPTION WHEN OTHERS THEN
            v_failure_count := v_failure_count + 1;
            v_result := jsonb_build_object(
                'success', false,
                'message', SQLERRM,
                'record_id', v_record_id
            );
            v_results := v_results || v_result;
        END;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_success_count as success_count,
        v_failure_count as failure_count,
        v_results as results;
END;
$$ LANGUAGE plpgsql;

-- Function to get validation statistics
CREATE OR REPLACE FUNCTION get_validation_stats()
RETURNS TABLE (
    total_records INTEGER,
    pending_records INTEGER,
    validated_records INTEGER,
    rejected_records INTEGER,
    migrated_records INTEGER,
    validation_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_records,
        COUNT(*) FILTER (WHERE validation_status = 'Pending')::INTEGER as pending_records,
        COUNT(*) FILTER (WHERE validation_status = 'Validated')::INTEGER as validated_records,
        COUNT(*) FILTER (WHERE validation_status = 'Rejected')::INTEGER as rejected_records,
        COUNT(*) FILTER (WHERE validation_status = 'Migrated')::INTEGER as migrated_records,
        ROUND(
            (COUNT(*) FILTER (WHERE validation_status = 'Validated')::NUMERIC / 
             NULLIF(COUNT(*) FILTER (WHERE validation_status IN ('Validated', 'Rejected')), 0)) * 100, 
            2
        ) as validation_rate
    FROM staging_vofc_records;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_validation_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_history TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_validation_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_stats TO authenticated;
