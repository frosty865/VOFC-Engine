'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '../app/lib/supabaseClient'

/**
 * RoleGate Component
 * Wraps admin pages and allows access only to 'admin' and 'spsa' users.
 * Uses /api/auth/verify for secure role lookup via Supabase service role.
 */
export default function RoleGate({ children }) {
  console.log('[ROLEGATE] Component rendering, checking access...')
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log('[ROLEGATE] useEffect running - verifying user access...')
    const verifyUser = async () => {
      try {
        console.log('[ROLEGATE] Getting Supabase session...')
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        console.log('[ROLEGATE] Session:', { hasSession: !!session, hasToken: !!token })
        
        console.log('[ROLEGATE] Calling /api/auth/verify...')
        const res = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        console.log('[ROLEGATE] Verify response:', { status: res.status, ok: res.ok })
        
        if (!res.ok) throw new Error('Verification failed')

        const { user } = await res.json()
        console.log('[ROLEGATE] User from verify:', { role: user?.role, group: user?.group })
        let role = user?.role || user?.group || 'user'

        if (['admin', 'spsa'].includes(String(role).toLowerCase())) {
          console.log('[ROLEGATE] ✅ Access granted for role:', role)
          setAllowed(true)
        } else {
          console.warn(`[ROLEGATE] ❌ Access denied for role: ${role} - redirecting`)
          router.replace('/dashboard')
        }
      } catch (err) {
        console.error('[ROLEGATE] Verify error, trying fallback:', err)
        // Fallback to client session info for gating if verify fails
        try {
          const { data: userData } = await supabase.auth.getUser()
          const u = userData?.user
          const role = (u?.user_metadata?.role || 'user').toLowerCase()
          console.log('[ROLEGATE] Fallback role check:', role)
          if (['admin', 'spsa'].includes(role)) {
            console.log('[ROLEGATE] ✅ Fallback access granted')
            setAllowed(true)
            return
          }
        } catch (fallbackErr) {
          console.error('[ROLEGATE] Fallback error:', fallbackErr)
        }
        console.error('[ROLEGATE] ❌ Auth verify error:', err)
        router.replace('/login')
      } finally {
        console.log('[ROLEGATE] Setting loading to false')
        setLoading(false)
      }
    }

    verifyUser()
  }, [router])

  console.log('[ROLEGATE] Render state:', { loading, allowed })
  
  if (loading) {
    console.log('[ROLEGATE] Showing loading screen...')
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking access...
      </div>
    )
  }

  if (!allowed) {
    console.log('[ROLEGATE] ❌ Access denied - not rendering children')
    return null
  }
  
  console.log('[ROLEGATE] ✅ Access granted - rendering children')
  return <>{children}</>
}

/**
 * Helper for role checks elsewhere
 */
export function hasAdminAccess(role) {
  return ['admin', 'spsa'].includes((role || '').toLowerCase())
}


