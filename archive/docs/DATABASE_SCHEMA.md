# VOFC Engine Database Schema Documentation

## 📊 Overview

The VOFC Engine database is designed with a **staging-to-production** architecture that supports secure document ingestion, validation, and publication workflows. The schema implements enterprise-grade security with Row Level Security (RLS), encrypted storage, and comprehensive audit logging.

## 🏗️ Architecture

### **Three-Tier Architecture**
1. **Staging Layer** - Document ingestion and validation
2. **Production Layer** - Published VOFC content
3. **Security Layer** - Authentication, authorization, and audit

---

## 🔐 Security Layer

### **User Management Tables**

#### `vofc_users`
**Purpose**: Core user authentication and profile management
```sql
CREATE TABLE vofc_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,                    -- bcrypt encrypted
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'spsa', 'psa', 'validator')),
    agency TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Security Features**:
- ✅ **Encrypted passwords** with bcrypt
- ✅ **Role-based access control** (Admin, SPSA, PSA, Validator)
- ✅ **Account lockout protection**
- ✅ **Audit trail** with timestamps

#### `user_sessions`
**Purpose**: Secure session management
```sql
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vofc_users(user_id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,            -- JWT token
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);
```

**Security Features**:
- ✅ **JWT token storage** (server-side only)
- ✅ **Automatic session cleanup**
- ✅ **Session expiration tracking**
- ✅ **No localStorage dependencies**

#### `user_permissions`
**Purpose**: Granular permission management
```sql
CREATE TABLE user_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vofc_users(user_id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'validate', 'promote', 'admin')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('questions', 'vulnerabilities', 'ofcs', 'staging', 'users')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES vofc_users(user_id)
);
```

---

## 📥 Staging Layer

### **Document Ingestion Tables**

#### `source_documents`
**Purpose**: Track uploaded documents and their processing status
```sql
CREATE TABLE source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ingestion_jobs`
**Purpose**: Track document processing jobs
```sql
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES source_documents(id) ON DELETE CASCADE,
    job_name TEXT NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('pdf_parse', 'document_analysis', 'vofc_extraction')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    configuration JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `staging_vofc_records`
**Purpose**: Store extracted VOFC content before validation
```sql
CREATE TABLE staging_vofc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_job_id UUID REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('Question', 'Vulnerability', 'OFC')),
    record_text TEXT NOT NULL,
    source_file TEXT,
    source_doc TEXT,
    page_number INTEGER,
    validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Validated', 'Rejected', 'Migrated')),
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    raw_data JSONB,
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `validation_log`
**Purpose**: Track all validation actions and decisions
```sql
CREATE TABLE validation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staging_record_id UUID REFERENCES staging_vofc_records(id) ON DELETE CASCADE,
    validator_id TEXT,
    validation_action TEXT NOT NULL CHECK (validation_action IN ('Validate', 'Reject', 'Modify', 'Flag', 'approve', 'reject', 'modify', 'flag')),
    previous_status TEXT,
    new_status TEXT,
    validation_notes TEXT,
    validation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    validation_data JSONB
);
```

---

## 🏭 Production Layer

### **Core VOFC Tables**

#### `vulnerabilities`
**Purpose**: Published security vulnerabilities
```sql
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability TEXT NOT NULL,
    discipline TEXT,
    sector TEXT,
    sector_id UUID REFERENCES sectors(id),
    subsector_id UUID REFERENCES subsectors(id),
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `options_for_consideration` (OFCs)
**Purpose**: Published Options for Consideration
```sql
CREATE TABLE options_for_consideration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    discipline TEXT,
    sector TEXT,
    effort_level TEXT,
    effectiveness TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `vulnerability_ofc_links`
**Purpose**: Link vulnerabilities to their related OFCs
```sql
CREATE TABLE vulnerability_ofc_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    ofc_id UUID REFERENCES options_for_consideration(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sectors` & `subsectors`
**Purpose**: Organizational structure for content categorization
```sql
CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subsectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    subsector_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💾 Backup System

### **Backup Management Tables**

#### `backup_metadata`
**Purpose**: Track encrypted database backups
```sql
CREATE TABLE backup_metadata (
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
```

#### `backup_verification`
**Purpose**: Track backup integrity verification
```sql
CREATE TABLE backup_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id UUID REFERENCES backup_metadata(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('integrity', 'restore_test', 'encryption')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
    verified_at TIMESTAMPTZ,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `backup_schedule`
**Purpose**: Automated backup scheduling
```sql
CREATE TABLE backup_schedule (
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
```

---

## 🔒 Security Implementation

### **Row Level Security (RLS)**
All tables have RLS enabled with role-based policies:

```sql
-- Example RLS Policy
CREATE POLICY "admin_access_users" ON vofc_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vofc_users 
            WHERE vofc_users.user_id = auth.uid() 
            AND vofc_users.role = 'admin'
        )
    );
```

### **Authentication Functions**
```sql
-- Secure user authentication
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username TEXT,
    p_password TEXT
) RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    agency TEXT,
    success BOOLEAN,
    message TEXT
);

-- Session management
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS TABLE (
    session_id UUID,
    success BOOLEAN,
    message TEXT
);
```

---

## 📈 Performance Optimization

### **Indexes**
```sql
-- User management indexes
CREATE INDEX idx_vofc_users_username ON vofc_users(username);
CREATE INDEX idx_vofc_users_role ON vofc_users(role);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Staging indexes
CREATE INDEX idx_staging_records_type ON staging_vofc_records(record_type);
CREATE INDEX idx_staging_records_status ON staging_vofc_records(validation_status);

-- Production indexes
CREATE INDEX idx_vulnerabilities_sector ON vulnerabilities(sector_id);
CREATE INDEX idx_vulnerability_ofc_links_vuln ON vulnerability_ofc_links(vulnerability_id);
```

### **Triggers**
```sql
-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## 🔄 Data Flow

### **Document Processing Workflow**
1. **Upload** → `source_documents`
2. **Process** → `ingestion_jobs`
3. **Extract** → `staging_vofc_records`
4. **Validate** → `validation_log`
5. **Publish** → Production tables

### **User Authentication Flow**
1. **Login** → `authenticate_user()` function
2. **Session** → `create_user_session()` function
3. **Verify** → `validate_session()` function
4. **Logout** → Session cleanup

### **Backup Workflow**
1. **Schedule** → `backup_schedule`
2. **Create** → `backup_metadata`
3. **Verify** → `backup_verification`
4. **Cleanup** → Retention policy

---

## 🛠️ Maintenance

### **Data Retention**
- **Sessions**: Auto-cleanup expired sessions
- **Backups**: Configurable retention (default: 30 days)
- **Logs**: Archive old validation logs

### **Monitoring**
- **Health checks**: Database connectivity
- **Performance**: Query execution times
- **Security**: Failed login attempts
- **Backups**: Success/failure rates

---

## 📋 Schema Summary

| **Layer** | **Tables** | **Purpose** |
|-----------|------------|-------------|
| **Security** | `vofc_users`, `user_sessions`, `user_permissions` | Authentication & Authorization |
| **Staging** | `source_documents`, `ingestion_jobs`, `staging_vofc_records`, `validation_log` | Document Processing |
| **Production** | `vulnerabilities`, `options_for_consideration`, `vulnerability_ofc_links`, `sectors`, `subsectors` | Published Content |
| **Backup** | `backup_metadata`, `backup_verification`, `backup_schedule` | Data Protection |

---

## 🔧 Setup Commands

### **Initialize Database**
```bash
# Run the secure authentication setup
node scripts/setup-secure-auth.js
```

### **Create Backup**
```bash
# Create encrypted backup
curl -X POST /api/backup/create
```

### **Health Check**
```bash
# Check database health
curl /api/health
```

---

## ⚠️ Security Notes

1. **All passwords** are bcrypt encrypted
2. **All sessions** are server-side only (no localStorage)
3. **All backups** are AES-256-GCM encrypted
4. **All tables** have Row Level Security enabled
5. **All operations** are logged for audit purposes

This schema provides a robust, secure foundation for the VOFC Engine with enterprise-grade security and comprehensive data protection.

