// /lib/supabase-client.js
import { createClient } from '@supabase/supabase-js'

// -------------------------
// Environment setup
// -------------------------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate env vars
if (!supabaseUrl) console.error('❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseAnonKey) console.error('⚠️ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!supabaseServiceKey) console.error('⚠️ Missing SUPABASE_SERVICE_ROLE_KEY')

// -------------------------
// Singleton Clients
// -------------------------
let supabaseClient
let supabaseAdminClient

// Public client (browser)
export const supabase = (() => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseClient
})()

// Admin client (server-side / API routes)
export const supabaseAdmin = (() => {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return supabaseAdminClient
})()

// Helper selector
export function getSupabaseClient(useServiceRole = false) {
  return useServiceRole ? supabaseAdmin : supabase
}

export default supabase
