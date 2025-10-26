import { createClient } from '@supabase/supabase-js'

// Get environment variables - these should be available on both client and server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    nodeEnv: process.env.NODE_ENV
  })
}

// Create a singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance = null
let supabaseAdminInstance = null

// Client-side Supabase instance (for browser/client components)
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  return supabaseInstance
})()

// Server-side Supabase instance (for API routes with service role)
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceKey || 'placeholder-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return supabaseAdminInstance
})()

// Helper function to get the appropriate client based on context
export function getSupabaseClient(useServiceRole = false) {
  if (useServiceRole) {
    return supabaseAdmin
  }
  return supabase
}

// Export both for backward compatibility
export { supabase as default }
