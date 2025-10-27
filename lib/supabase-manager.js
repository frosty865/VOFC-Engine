// DEPRECATED: Use lib/supabase-client.js instead
// This file is kept for backward compatibility
import { supabase, supabaseAdmin } from './supabase-client.js'

export function getServerClient() {
  return supabaseAdmin;
}

export function getAnonClient() {
  return supabase;
}