import { createClient } from '@supabase/supabase-js'

// Centralized Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client-side Supabase instance (for browser/client components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase instance (for API routes with service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to get the appropriate client based on context
export function getSupabaseClient(useServiceRole = false) {
  if (useServiceRole) {
    return supabaseAdmin
  }
  return supabase
}

// Export both for backward compatibility
export { supabase as default }
