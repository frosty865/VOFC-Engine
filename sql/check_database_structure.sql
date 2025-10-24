-- Check current database structure
-- This script helps identify the actual column names in the database

-- Check sources table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sources' 
ORDER BY ordinal_position;

-- Check if sectors table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('sectors', 'subsectors', 'disciplines');

-- Check vulnerabilities table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'vulnerabilities' 
ORDER BY ordinal_position;

-- Check options_for_consideration table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'options_for_consideration' 
ORDER BY ordinal_position;

-- Check ofc_sources table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ofc_sources' 
ORDER BY ordinal_position;
