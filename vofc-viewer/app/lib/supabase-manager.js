// DEPRECATED: Use lib/supabase-client.js instead
// This file is kept for backward compatibility
import { supabase, supabaseAdmin } from '../../lib/supabase-client.js'

export function getClient() {
  return supabase;
}

export function getServerClient() {
  return supabaseAdmin;
}

// Export the main client for backward compatibility
export { supabase, supabaseAdmin as supabaseServer }
