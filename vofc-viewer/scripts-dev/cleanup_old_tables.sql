-- Remove all old user tables and start fresh
-- This will clean up the conflicting authentication systems

-- Drop old user tables
DROP TABLE IF EXISTS public.vofc_users CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;
DROP TABLE IF EXISTS public.user_agency_relationships CASCADE;

-- Drop any related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop any related views
DROP VIEW IF EXISTS public.user_permissions_summary CASCADE;

-- Clean up any RLS policies that might reference these tables
-- (Supabase will handle this automatically when tables are dropped)

-- Note: We're keeping the core VOFC tables:
-- - options_for_consideration
-- - vulnerabilities  
-- - sources
-- - vulnerability_ofc_links
-- - etc.
