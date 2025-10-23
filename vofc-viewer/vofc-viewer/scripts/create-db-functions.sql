-- Create database functions and views for optimized queries
-- This script creates the missing functions that the application is trying to call

-- 1. Create view for OFCs with sources
CREATE OR REPLACE VIEW ofcs_with_sources AS
SELECT
  o.id,
  o.option_text,
  o.discipline,
  o.sector_id,
  o.subsector_id,
  o.vulnerability_id,
  o.created_at,
  o.updated_at,
  STRING_AGG(s.source_id::text, ', ') AS sources
FROM options_for_consideration o
LEFT JOIN ofc_sources os ON o.id = os.ofc_id
LEFT JOIN sources s ON os.source_id = s.id
GROUP BY o.id, o.option_text, o.discipline, o.sector_id, o.subsector_id, o.vulnerability_id, o.created_at, o.updated_at
ORDER BY o.created_at DESC;

-- 2. Create view for vulnerabilities with OFCs
CREATE OR REPLACE VIEW vulnerabilities_with_ofcs AS
SELECT
  v.id,
  v.vulnerability_name,
  v.description,
  v.discipline,
  v.sector_id,
  v.subsector_id,
  v.created_at,
  v.updated_at,
  COUNT(o.id) as ofc_count,
  STRING_AGG(o.id::text, ', ') AS ofc_ids
FROM vulnerabilities v
LEFT JOIN options_for_consideration o ON v.id = o.vulnerability_id
GROUP BY v.id, v.vulnerability_name, v.description, v.discipline, v.sector_id, v.subsector_id, v.created_at, v.updated_at
ORDER BY v.created_at DESC;

-- 3. Create function to get OFCs with sources
CREATE OR REPLACE FUNCTION get_ofcs_with_sources()
RETURNS SETOF ofcs_with_sources
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM ofcs_with_sources;
END;
$$;

-- 4. Create function to get vulnerabilities with OFCs
CREATE OR REPLACE FUNCTION get_vulnerabilities_with_ofcs()
RETURNS SETOF vulnerabilities_with_ofcs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM vulnerabilities_with_ofcs;
END;
$$;

-- 5. Grant necessary permissions
GRANT SELECT ON ofcs_with_sources TO authenticated;
GRANT SELECT ON vulnerabilities_with_ofcs TO authenticated;
GRANT EXECUTE ON FUNCTION get_ofcs_with_sources() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vulnerabilities_with_ofcs() TO authenticated;

-- 6. Enable RLS on views (if needed)
ALTER VIEW ofcs_with_sources SET (security_invoker = true);
ALTER VIEW vulnerabilities_with_ofcs SET (security_invoker = true);














