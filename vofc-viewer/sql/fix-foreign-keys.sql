-- Fix foreign key relationships for OFC sources
-- This script creates the proper foreign key constraints

-- Add foreign key constraint to ofc_sources table
ALTER TABLE ofc_sources 
ADD CONSTRAINT fk_ofc_sources_ofc_id 
FOREIGN KEY (ofc_id) REFERENCES options_for_consideration(id) ON DELETE CASCADE;

-- Add foreign key constraint to ofc_sources table for source_id
ALTER TABLE ofc_sources 
ADD CONSTRAINT fk_ofc_sources_source_id 
FOREIGN KEY (source_id) REFERENCES sources("reference number") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ofc_sources_ofc_id ON ofc_sources(ofc_id);
CREATE INDEX IF NOT EXISTS idx_ofc_sources_source_id ON ofc_sources(source_id);

-- Verify the relationships exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='ofc_sources';

