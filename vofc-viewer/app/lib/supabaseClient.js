import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Ensure singleton Supabase client to avoid multiple GoTrueClient instances
// Use global window property for client-side to ensure true singleton across all modules
let supabaseInstance = null;

function createSupabaseClient() {
  // Client-side: use window object to ensure single instance across all modules
  if (typeof window !== 'undefined') {
    if (window.__supabaseClientInstance) {
      return window.__supabaseClientInstance;
    }

    const clientOptions = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'sb-auth-token'
      }
    };

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    window.__supabaseClientInstance = supabaseInstance;
    return supabaseInstance;
  }

  // Server-side: use module-level singleton
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const clientOptions = {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  };

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  return supabaseInstance;
}

// Create singleton instance
export const supabase = createSupabaseClient();