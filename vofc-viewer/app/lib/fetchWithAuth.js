import { supabase } from './supabaseClient'

/**
 * Fetch wrapper that automatically includes Supabase auth token
 */
export async function fetchWithAuth(url, options = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  } catch (error) {
    console.error('Error in fetchWithAuth:', error)
    throw error
  }
}

