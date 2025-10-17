-- Database Backup Schema
-- Implements secure backup metadata storage

-- Backup metadata table
CREATE TABLE IF NOT EXISTS backup_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    encryption_key_hash TEXT,
    checksum TEXT,
    retention_until TIMESTAMPTZ,
    created_by UUID REFERENCES vofc_users(user_id),
    notes TEXT
);

-- Backup verification table
CREATE TABLE IF NOT EXISTS backup_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id UUID REFERENCES backup_metadata(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('integrity', 'restore_test', 'encryption')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
    verified_at TIMESTAMPTZ,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup schedule table
CREATE TABLE IF NOT EXISTS backup_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_name TEXT NOT NULL UNIQUE,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    time_of_day TIME,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    retention_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ
);

-- Enable RLS on backup tables
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backup tables
-- Only admins can access backup data
CREATE POLICY "admin_access_backups" ON backup_metadata
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vofc_users 
            WHERE vofc_users.user_id = auth.uid() 
            AND vofc_users.role = 'admin'
        )
    );

CREATE POLICY "admin_access_verification" ON backup_verification
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vofc_users 
            WHERE vofc_users.user_id = auth.uid() 
            AND vofc_users.role = 'admin'
        )
    );

CREATE POLICY "admin_access_schedule" ON backup_schedule
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vofc_users 
            WHERE vofc_users.user_id = auth.uid() 
            AND vofc_users.role = 'admin'
        )
    );

-- Function to create backup metadata
CREATE OR REPLACE FUNCTION create_backup_metadata(
    p_file_name TEXT,
    p_file_path TEXT,
    p_file_size BIGINT,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_backup_id UUID;
BEGIN
    INSERT INTO backup_metadata (
        file_name,
        file_path,
        file_size,
        created_by,
        status
    ) VALUES (
        p_file_name,
        p_file_path,
        p_file_size,
        p_created_by,
        'pending'
    ) RETURNING id INTO v_backup_id;
    
    RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update backup status
CREATE OR REPLACE FUNCTION update_backup_status(
    p_backup_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE backup_metadata 
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_backup_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups(
    p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM backup_metadata 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days
    AND status = 'completed';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default backup schedule
INSERT INTO backup_schedule (
    schedule_name,
    frequency,
    time_of_day,
    retention_days,
    is_active
) VALUES (
    'daily_backup',
    'daily',
    '02:00:00',
    30,
    true
) ON CONFLICT (schedule_name) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_backup_metadata_created_at ON backup_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_status ON backup_metadata(status);
CREATE INDEX IF NOT EXISTS idx_backup_schedule_next_run ON backup_schedule(next_run);

