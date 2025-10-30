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
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!res.ok) throw new Error('Verification failed')

        const { user } = await res.json()
        let role = user?.role || user?.group || 'user'

        if (['admin', 'spsa'].includes(String(role).toLowerCase())) {
          setAllowed(true)
        } else {
          console.warn(`Redirected unauthorized role: ${role}`)
          router.replace('/dashboard')
        }
      } catch (err) {
        // Fallback to client session info for gating if verify fails
        try {
          const { data: userData } = await supabase.auth.getUser()
          const u = userData?.user
          const role = (u?.user_metadata?.role || 'user').toLowerCase()
          if (['admin', 'spsa'].includes(role)) {
            setAllowed(true)
            return
          }
        } catch {}
        console.error('Auth verify error:', err)
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
  }, [router])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking access...
      </div>
    )

  if (!allowed) return null
  return <>{children}</>
}

/**
 * Helper for role checks elsewhere
 */
export function hasAdminAccess(role) {
  return ['admin', 'spsa'].includes((role || '').toLowerCase())
}


