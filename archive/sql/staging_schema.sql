-- VOFC Staging Schema
-- This schema supports the staging approach for document ingestion

-- Source documents table
CREATE TABLE IF NOT EXISTS source_documents (
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

-- Ingestion jobs table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
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

-- Staging VOFC records table
CREATE TABLE IF NOT EXISTS staging_vofc_records (
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

-- Validation log table
CREATE TABLE IF NOT EXISTS validation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staging_record_id UUID REFERENCES staging_vofc_records(id) ON DELETE CASCADE,
    validator_id TEXT, -- Now accepts text for validator name/ID
    validation_action TEXT NOT NULL CHECK (validation_action IN ('Validate', 'Reject', 'Modify', 'Flag', 'approve', 'reject', 'modify', 'flag')),
    previous_status TEXT,
    new_status TEXT,
    validation_notes TEXT,
    validation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    validation_data JSONB
);

-- Production tables (existing schema)
-- These would be your main questions, ofcs, vulnerabilities tables
-- that get populated from validated staging records

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_source_documents_status ON source_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_document ON ingestion_jobs(source_document_id);
CREATE INDEX IF NOT EXISTS idx_staging_records_type ON staging_vofc_records(record_type);
CREATE INDEX IF NOT EXISTS idx_staging_records_status ON staging_vofc_records(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_records_job ON staging_vofc_records(ingestion_job_id);
CREATE INDEX IF NOT EXISTS idx_validation_log_record ON validation_log(staging_record_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_source_documents_updated_at BEFORE UPDATE ON source_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingestion_jobs_updated_at BEFORE UPDATE ON ingestion_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staging_vofc_records_updated_at BEFORE UPDATE ON staging_vofc_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_vofc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth requirements)
CREATE POLICY "Allow all operations for authenticated users" ON source_documents FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON ingestion_jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON staging_vofc_records FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON validation_log FOR ALL USING (true);
