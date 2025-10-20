-- Fix the authenticate_user function to resolve column ambiguity
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    agency TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_password_valid BOOLEAN;
BEGIN
    -- Get user by username
    SELECT * INTO v_user 
    FROM vofc_users 
    WHERE vofc_users.username = p_username AND vofc_users.is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as success,
            'User not found or inactive' as message;
        RETURN;
    END IF;
    
    -- Verify password
    SELECT crypt(p_password, v_user.password_hash) = v_user.password_hash INTO v_password_valid;
    
    IF NOT v_password_valid THEN
        RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as success,
            'Invalid password' as message;
        RETURN;
    END IF;
    
    -- Update last login
    UPDATE vofc_users 
    SET last_login = NOW() 
    WHERE vofc_users.user_id = v_user.user_id;
    
    -- Return user data
    RETURN QUERY SELECT 
        v_user.user_id,
        v_user.username,
        v_user.full_name,
        v_user.role,
        v_user.agency,
        true as success,
        'Authentication successful' as message;
        
END;
$$ LANGUAGE plpgsql;
