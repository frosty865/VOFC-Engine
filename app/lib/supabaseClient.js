// Use the global Supabase client manager
import { getClient } from './supabase-manager';

// Export the managed client
export const supabase = getClient();
export const getSupabaseClient = getClient;