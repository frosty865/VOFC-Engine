-- Enhanced Row Level Security (RLS) policies for multi-agency collaboration
-- This extends the existing enhanced_processing_schema.sql and enhanced_learning_schema.sql

-- Create user roles and permissions system
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL UNIQUE,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agency/organization table for multi-tenant support
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_name TEXT NOT NULL UNIQUE,
    agency_code TEXT NOT NULL UNIQUE,
    agency_type TEXT NOT NULL, -- 'federal', 'state', 'local', 'private'
    security_clearance_level TEXT NOT NULL, -- 'public', 'confidential', 'secret', 'top_secret'
    data_classification TEXT NOT NULL, -- 'public', 'internal', 'confidential', 'restricted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user-agency relationships
CREATE TABLE IF NOT EXISTS user_agency_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
    security_clearance_level TEXT NOT NULL,
    data_access_level TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agency_id)
);

-- Create data classification levels
CREATE TABLE IF NOT EXISTS data_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classification_name TEXT NOT NULL UNIQUE,
    classification_level INTEGER NOT NULL, -- 1=public, 2=internal, 3=confidential, 4=restricted
    description TEXT,
    access_requirements JSONB, -- Specific access requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default data classifications
INSERT INTO data_classifications (classification_name, classification_level, description, access_requirements) VALUES
('Public', 1, 'Publicly accessible data', '{"authentication": false}'),
('Internal', 2, 'Internal agency data', '{"authentication": true, "agency_membership": true}'),
('Confidential', 3, 'Confidential data requiring clearance', '{"authentication": true, "security_clearance": "confidential"}'),
('Restricted', 4, 'Restricted data requiring high clearance', '{"authentication": true, "security_clearance": "secret", "agency_approval": true}')
ON CONFLICT (classification_name) DO NOTHING;

-- Insert default user roles
INSERT INTO user_roles (role_name, role_description, permissions) VALUES
('viewer', 'Read-only access to public and internal data', '{"read": true, "write": false, "delete": false, "admin": false}'),
('analyst', 'Full access to internal data, limited confidential access', '{"read": true, "write": true, "delete": false, "admin": false}'),
('senior_analyst', 'Full access to confidential data', '{"read": true, "write": true, "delete": true, "admin": false}'),
('admin', 'Full administrative access', '{"read": true, "write": true, "delete": true, "admin": true}'),
('security_officer', 'Security oversight and audit access', '{"read": true, "write": false, "delete": false, "admin": false, "audit": true}')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default agencies
INSERT INTO agencies (agency_name, agency_code, agency_type, security_clearance_level, data_classification) VALUES
('Department of Homeland Security', 'DHS', 'federal', 'top_secret', 'restricted'),
('Cybersecurity and Infrastructure Security Agency', 'CISA', 'federal', 'top_secret', 'restricted'),
('Federal Emergency Management Agency', 'FEMA', 'federal', 'secret', 'confidential'),
('State and Local Partners', 'SLP', 'state', 'confidential', 'internal'),
('Private Sector Partners', 'PSP', 'private', 'confidential', 'internal')
ON CONFLICT (agency_name) DO NOTHING;

-- Enhanced RLS policies for document_processing_enhanced
DROP POLICY IF EXISTS "Allow authenticated read access to document_processing_enhanced" ON document_processing_enhanced;
DROP POLICY IF EXISTS "Allow service role full access to document_processing_enhanced" ON document_processing_enhanced;

-- Multi-agency access policy for document processing
CREATE POLICY "Multi-agency document processing access" ON document_processing_enhanced
FOR ALL
USING (
    -- Service role has full access
    auth.role() = 'service_role' OR
    -- Users can access documents from their agency
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        JOIN agencies a ON uar.agency_id = a.id
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Public data accessible to all authenticated users
            (document_processing_enhanced.data_classification = 'public') OR
            -- Internal data accessible to agency members
            (document_processing_enhanced.data_classification = 'internal' AND uar.agency_id = document_processing_enhanced.agency_id) OR
            -- Confidential data accessible to users with appropriate clearance
            (document_processing_enhanced.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
            -- Restricted data accessible to users with high clearance
            (document_processing_enhanced.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
        )
    )
);

-- Enhanced RLS policies for batch_jobs
DROP POLICY IF EXISTS "Allow authenticated read access to batch_jobs" ON batch_jobs;
DROP POLICY IF EXISTS "Allow service role full access to batch_jobs" ON batch_jobs;

CREATE POLICY "Multi-agency batch job access" ON batch_jobs
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Users can access batch jobs they created
            batch_jobs.created_by = auth.uid() OR
            -- Users can access batch jobs from their agency
            EXISTS (
                SELECT 1 FROM document_processing_enhanced dpe
                WHERE dpe.batch_id = batch_jobs.id
                AND (
                    (dpe.data_classification = 'public') OR
                    (dpe.data_classification = 'internal' AND uar.agency_id = dpe.agency_id) OR
                    (dpe.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
                    (dpe.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
                )
            )
        )
    )
);

-- Enhanced RLS policies for learning_events_enhanced
DROP POLICY IF EXISTS "Allow authenticated read access to learning_events_enhanced" ON learning_events_enhanced;
DROP POLICY IF EXISTS "Allow service role full access to learning_events_enhanced" ON learning_events_enhanced;

CREATE POLICY "Multi-agency learning events access" ON learning_events_enhanced
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Learning events are generally accessible to authenticated users
            -- but may be filtered by agency in the future
            true
        )
    )
);

-- Enhanced RLS policies for learning_feedback
DROP POLICY IF EXISTS "Allow authenticated read access to learning_feedback" ON learning_feedback;
DROP POLICY IF EXISTS "Allow service role full access to learning_feedback" ON learning_feedback;

CREATE POLICY "Multi-agency learning feedback access" ON learning_feedback
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Users can access feedback they created
            learning_feedback.user_id = auth.uid() OR
            -- Users can access feedback for documents they have access to
            EXISTS (
                SELECT 1 FROM document_processing_enhanced dpe
                WHERE dpe.id = learning_feedback.document_id
                AND (
                    (dpe.data_classification = 'public') OR
                    (dpe.data_classification = 'internal' AND uar.agency_id = dpe.agency_id) OR
                    (dpe.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
                    (dpe.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
                )
            )
        )
    )
);

-- Enhanced RLS policies for security_validations
DROP POLICY IF EXISTS "Allow authenticated read access to security_validations" ON security_validations;
DROP POLICY IF EXISTS "Allow service role full access to security_validations" ON security_validations;

CREATE POLICY "Multi-agency security validation access" ON security_validations
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Security officers have full access
            EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.id = uar.role_id
                AND ur.role_name = 'security_officer'
            ) OR
            -- Users can access security validations for documents they have access to
            EXISTS (
                SELECT 1 FROM document_processing_enhanced dpe
                WHERE dpe.filename = security_validations.filename
                AND (
                    (dpe.data_classification = 'public') OR
                    (dpe.data_classification = 'internal' AND uar.agency_id = dpe.agency_id) OR
                    (dpe.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
                    (dpe.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
                )
            )
        )
    )
);

-- Enhanced RLS policies for confidence_analyses
DROP POLICY IF EXISTS "Allow authenticated read access to confidence_analyses" ON confidence_analyses;
DROP POLICY IF EXISTS "Allow service role full access to confidence_analyses" ON confidence_analyses;

CREATE POLICY "Multi-agency confidence analysis access" ON confidence_analyses
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Users can access confidence analyses for documents they have access to
            EXISTS (
                SELECT 1 FROM document_processing_enhanced dpe
                WHERE dpe.id = confidence_analyses.document_id
                AND (
                    (dpe.data_classification = 'public') OR
                    (dpe.data_classification = 'internal' AND uar.agency_id = dpe.agency_id) OR
                    (dpe.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
                    (dpe.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
                )
            )
        )
    )
);

-- Enhanced RLS policies for heuristic_patterns
DROP POLICY IF EXISTS "Allow authenticated read access to heuristic_patterns" ON heuristic_patterns;
DROP POLICY IF EXISTS "Allow service role full access to heuristic_patterns" ON heuristic_patterns;

CREATE POLICY "Multi-agency heuristic patterns access" ON heuristic_patterns
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Heuristic patterns are generally accessible to authenticated users
            -- but may be filtered by agency in the future
            true
        )
    )
);

-- Enhanced RLS policies for learning_insights
DROP POLICY IF EXISTS "Allow authenticated read access to learning_insights" ON learning_insights;
DROP POLICY IF EXISTS "Allow service role full access to learning_insights" ON learning_insights;

CREATE POLICY "Multi-agency learning insights access" ON learning_insights
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Learning insights are generally accessible to authenticated users
            -- but may be filtered by agency in the future
            true
        )
    )
);

-- Enhanced RLS policies for learning_statistics_historical
DROP POLICY IF EXISTS "Allow authenticated read access to learning_statistics_historical" ON learning_statistics_historical;
DROP POLICY IF EXISTS "Allow service role full access to learning_statistics_historical" ON learning_statistics_historical;

CREATE POLICY "Multi-agency learning statistics access" ON learning_statistics_historical
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Learning statistics are generally accessible to authenticated users
            -- but may be filtered by agency in the future
            true
        )
    )
);

-- Enhanced RLS policies for batch_job_progress
DROP POLICY IF EXISTS "Allow authenticated read access to batch_job_progress" ON batch_job_progress;
DROP POLICY IF EXISTS "Allow service role full access to batch_job_progress" ON batch_job_progress;

CREATE POLICY "Multi-agency batch job progress access" ON batch_job_progress
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Users can access progress for batch jobs they have access to
            EXISTS (
                SELECT 1 FROM batch_jobs bj
                WHERE bj.id = batch_job_progress.batch_id
                AND (
                    bj.created_by = auth.uid() OR
                    EXISTS (
                        SELECT 1 FROM document_processing_enhanced dpe
                        WHERE dpe.batch_id = bj.id
                        AND (
                            (dpe.data_classification = 'public') OR
                            (dpe.data_classification = 'internal' AND uar.agency_id = dpe.agency_id) OR
                            (dpe.data_classification = 'confidential' AND uar.security_clearance_level IN ('confidential', 'secret', 'top_secret')) OR
                            (dpe.data_classification = 'restricted' AND uar.security_clearance_level IN ('secret', 'top_secret'))
                        )
                    )
                )
            )
        )
    )
);

-- Enhanced RLS policies for learning_model_updates
DROP POLICY IF EXISTS "Allow authenticated read access to learning_model_updates" ON learning_model_updates;
DROP POLICY IF EXISTS "Allow service role full access to learning_model_updates" ON learning_model_updates;

CREATE POLICY "Multi-agency learning model updates access" ON learning_model_updates
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Learning model updates are generally accessible to authenticated users
            -- but may be filtered by agency in the future
            true
        )
    )
);

-- Create audit trail table for security events
CREATE TABLE IF NOT EXISTS security_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    agency_id UUID REFERENCES agencies(id),
    security_clearance_level TEXT,
    data_classification TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit trail
ALTER TABLE security_audit_trail ENABLE ROW LEVEL SECURITY;

-- Audit trail access policy
CREATE POLICY "Audit trail access" ON security_audit_trail
FOR ALL
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM user_agency_relationships uar
        WHERE uar.user_id = auth.uid()
        AND uar.is_active = true
        AND (
            -- Security officers have full access
            EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.id = uar.role_id
                AND ur.role_name = 'security_officer'
            ) OR
            -- Users can access their own audit trail
            security_audit_trail.user_id = auth.uid() OR
            -- Users can access audit trail for their agency
            security_audit_trail.agency_id = uar.agency_id
        )
    )
);

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_trail (
        user_id,
        action,
        resource_type,
        resource_id,
        agency_id,
        security_clearance_level,
        data_classification,
        ip_address,
        user_agent,
        metadata
    )
    SELECT 
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        uar.agency_id,
        uar.security_clearance_level,
        'internal', -- Default classification
        NULL, -- IP address would need to be passed from application
        NULL, -- User agent would need to be passed from application
        p_metadata
    FROM user_agency_relationships uar
    WHERE uar.user_id = auth.uid()
    AND uar.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_permission TEXT,
    p_resource_classification TEXT DEFAULT 'public'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_clearance TEXT;
    user_role TEXT;
BEGIN
    -- Get user's security clearance and role
    SELECT 
        uar.security_clearance_level,
        ur.role_name
    INTO user_clearance, user_role
    FROM user_agency_relationships uar
    JOIN user_roles ur ON uar.role_id = ur.id
    WHERE uar.user_id = auth.uid()
    AND uar.is_active = true
    LIMIT 1;

    -- Check if user has required clearance
    IF p_resource_classification = 'restricted' AND user_clearance NOT IN ('secret', 'top_secret') THEN
        RETURN FALSE;
    END IF;

    IF p_resource_classification = 'confidential' AND user_clearance NOT IN ('confidential', 'secret', 'top_secret') THEN
        RETURN FALSE;
    END IF;

    -- Check role-based permissions
    IF p_permission = 'admin' AND user_role != 'admin' THEN
        RETURN FALSE;
    END IF;

    IF p_permission = 'audit' AND user_role NOT IN ('security_officer', 'admin') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_agency_relationships_user ON user_agency_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agency_relationships_agency ON user_agency_relationships(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_agency_relationships_active ON user_agency_relationships(is_active);
CREATE INDEX IF NOT EXISTS idx_security_audit_trail_user ON security_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_trail_action ON security_audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_trail_created ON security_audit_trail(created_at);

-- Create view for user permissions summary
CREATE OR REPLACE VIEW user_permissions_summary AS
SELECT 
    u.id as user_id,
    u.email,
    a.agency_name,
    a.agency_code,
    a.agency_type,
    ur.role_name,
    uar.security_clearance_level,
    uar.data_access_level,
    uar.is_active,
    ur.permissions,
    uar.created_at as relationship_created
FROM auth.users u
JOIN user_agency_relationships uar ON u.id = uar.user_id
JOIN agencies a ON uar.agency_id = a.id
JOIN user_roles ur ON uar.role_id = ur.id
WHERE uar.is_active = true;

-- Create view for security audit summary
CREATE OR REPLACE VIEW security_audit_summary AS
SELECT 
    sat.action,
    sat.resource_type,
    a.agency_name,
    sat.security_clearance_level,
    sat.data_classification,
    COUNT(*) as event_count,
    DATE(sat.created_at) as event_date
FROM security_audit_trail sat
LEFT JOIN agencies a ON sat.agency_id = a.id
WHERE sat.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sat.action, sat.resource_type, a.agency_name, sat.security_clearance_level, sat.data_classification, DATE(sat.created_at)
ORDER BY event_date DESC, event_count DESC;
