'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/app/lib/supabase-client.js'

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
    let isMounted = true
    let timeoutId = null

    const verifyUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[ROLEGATE] Session error:', sessionError)
          if (isMounted) {
            setLoading(false)
            router.replace('/login')
          }
          return
        }

        if (!session) {
          // No session - redirect to login
          if (isMounted) {
            setLoading(false)
            router.replace('/login')
          }
          return
        }

        const token = session?.access_token
        
        const res = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          console.error('[ROLEGATE] Verify failed:', res.status, errorData)
          if (isMounted) {
            setLoading(false)
            if (res.status === 401) {
              router.replace('/login')
            } else {
              router.replace('/dashboard')
            }
          }
          return
        }

        const result = await res.json()
        if (!result.success || !result.user) {
          if (isMounted) {
            setLoading(false)
            router.replace('/dashboard')
          }
          return
        }

        const { user } = result
        const role = String(user?.role || user?.group || 'user').toLowerCase()

        if (['admin', 'spsa'].includes(role)) {
          if (isMounted) {
            setAllowed(true)
            setLoading(false)
          }
        } else {
          if (isMounted) {
            setLoading(false)
            router.replace('/dashboard')
          }
        }
      } catch (err) {
        console.error('[ROLEGATE] Verify error:', err)
        if (isMounted) {
          setLoading(false)
          router.replace('/login')
        }
      }
    }

    // Set timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[ROLEGATE] Verification timeout')
        setLoading(false)
        router.replace('/dashboard')
      }
    }, 10000) // 10 second timeout

    verifyUser()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking access...
      </div>
    )
  }

  if (!allowed) {
    return null
  }
  
  return <>{children}</>
}

/**
 * Helper for role checks elsewhere
 */
export function hasAdminAccess(role) {
  return ['admin', 'spsa'].includes((role || '').toLowerCase())
}


