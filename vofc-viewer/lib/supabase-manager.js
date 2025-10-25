import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for server client');
}

let supabaseServerClient = null;

export function getServerClient() {
  if (!supabaseServerClient) {
    supabaseServerClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseServerClient;
}

export function getAnonClient() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables for anon client');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}