// Global Supabase Client Manager
// This ensures only one client instance is created across the entire application

import { createClient } from '@supabase/supabase-js';

// Global client instances
let clientInstance = null;
let serverInstance = null;

// Client-side Supabase client (for browser)
export function getClient() {
  if (typeof window === 'undefined') {
    // Server-side: return null to avoid client creation on server
    return null;
  }

  if (!clientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables for client');
      return null;
    }

    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    console.log('🔧 Created single Supabase client instance');
  }

  return clientInstance;
}

// Server-side Supabase client (for API routes)
export function getServerClient() {
  if (typeof window !== 'undefined') {
    // Client-side: return null to avoid server client creation on client
    return null;
  }

  if (!serverInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables for server');
      return null;
    }

    serverInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log('🔧 Created single Supabase server instance');
  }

  return serverInstance;
}

// Export the main client for backward compatibility
export const supabase = getClient();
export const supabaseServer = getServerClient();
