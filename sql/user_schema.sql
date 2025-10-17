-- VOFC User Management Schema
-- This schema handles user authentication and authorization

-- Users table for VOFC system
CREATE TABLE IF NOT EXISTS vofc_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'spsa', 'psa', 'validator')),
    agency TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vofc_users(user_id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vofc_users(user_id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'validate', 'promote', 'admin')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('questions', 'vulnerabilities', 'ofcs', 'staging', 'users')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES vofc_users(user_id)
);

-- Role-based permissions
INSERT INTO user_permissions (user_id, permission_type, resource_type, granted_by)
SELECT 
    u.user_id,
    CASE 
        WHEN u.role = 'admin' THEN 'admin'
        WHEN u.role = 'spsa' THEN 'write'
        WHEN u.role = 'psa' THEN 'write'
        WHEN u.role = 'validator' THEN 'validate'
        ELSE 'read'
    END,
    'staging',
    u.user_id
FROM vofc_users u
ON CONFLICT DO NOTHING;

-- Grant admin permissions to admin users
INSERT INTO user_permissions (user_id, permission_type, resource_type, granted_by)
SELECT 
    u.user_id,
    'admin',
    'users',
    u.user_id
FROM vofc_users u
WHERE u.role = 'admin'
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vofc_users_username ON vofc_users(username);
CREATE INDEX IF NOT EXISTS idx_vofc_users_role ON vofc_users(role);
CREATE INDEX IF NOT EXISTS idx_vofc_users_active ON vofc_users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_type ON user_permissions(permission_type);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vofc_users_updated_at BEFORE UPDATE ON vofc_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE vofc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth requirements)
CREATE POLICY "Users can view their own data" ON vofc_users FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Admins can view all users" ON vofc_users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM vofc_users 
        WHERE user_id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can view their own permissions" ON user_permissions FOR SELECT USING (user_id::text = auth.uid()::text);

-- Function to authenticate user
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
    WHERE username = p_username AND is_active = true;
    
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
    WHERE user_id = v_user.user_id;
    
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

-- Function to create user session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
    session_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    -- Clean up expired sessions for this user
    DELETE FROM user_sessions 
    WHERE user_id = p_user_id AND expires_at < NOW();
    
    -- Create new session
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (p_user_id, p_session_token, p_expires_at);
    
    RETURN QUERY SELECT 
        (SELECT session_id FROM user_sessions WHERE session_token = p_session_token) as session_id,
        true as success,
        'Session created successfully' as message;
        
END;
$$ LANGUAGE plpgsql;

-- Function to validate session
CREATE OR REPLACE FUNCTION validate_session(
    p_session_token TEXT
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    agency TEXT,
    valid BOOLEAN
) AS $$
DECLARE
    v_session RECORD;
    v_user RECORD;
BEGIN
    -- Get session
    SELECT * INTO v_session 
    FROM user_sessions 
    WHERE session_token = p_session_token AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as valid;
        RETURN;
    END IF;
    
    -- Get user data
    SELECT * INTO v_user 
    FROM vofc_users 
    WHERE user_id = v_session.user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID as user_id,
            NULL::TEXT as username,
            NULL::TEXT as full_name,
            NULL::TEXT as role,
            NULL::TEXT as agency,
            false as valid;
        RETURN;
    END IF;
    
    -- Update last accessed
    UPDATE user_sessions 
    SET last_accessed = NOW() 
    WHERE session_id = v_session.session_id;
    
    -- Return user data
    RETURN QUERY SELECT 
        v_user.user_id,
        v_user.username,
        v_user.full_name,
        v_user.role,
        v_user.agency,
        true as valid;
        
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session TO authenticated;
