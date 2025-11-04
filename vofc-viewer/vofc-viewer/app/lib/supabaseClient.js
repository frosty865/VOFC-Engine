// Re-export from standardized client for backward compatibility
// New code should use @/lib/supabase-client or @/lib/supabase-admin
export { supabase } from './supabase-client.js'
export { supabaseAdmin } from './supabase-admin.js'
export { supabase as default } from './supabase-client.js'