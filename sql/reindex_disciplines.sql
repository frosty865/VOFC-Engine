-- Reindex disciplines table and related tables
-- This script optimizes the disciplines table and related foreign key tables

-- Reindex the disciplines table
REINDEX TABLE disciplines;

-- Reindex the foreign key indexes
REINDEX INDEX idx_disciplines_name;
REINDEX INDEX idx_disciplines_category;
REINDEX INDEX idx_disciplines_active;

-- Reindex the foreign key columns in related tables
REINDEX INDEX idx_vulnerabilities_discipline_id;
REINDEX INDEX idx_ofcs_discipline_id;

-- Update table statistics for better query planning
ANALYZE disciplines;
ANALYZE vulnerabilities;
ANALYZE options_for_consideration;

-- Check table sizes and index usage
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('disciplines', 'vulnerabilities', 'options_for_consideration')
ORDER BY tablename, attname;

-- Show index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('disciplines', 'vulnerabilities', 'options_for_consideration')
ORDER BY tablename, indexname;
