'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
        const res = await fetch('/api/auth/verify', { method: 'GET', credentials: 'include' })
        if (!res.ok) throw new Error('Verification failed')

        const { user } = await res.json()
        const role = user?.role || user?.group || 'user'

        if (['admin', 'spsa'].includes(String(role).toLowerCase())) {
          setAllowed(true)
        } else {
          console.warn(`Redirected unauthorized role: ${role}`)
          router.push('/dashboard')
        }
      } catch (err) {
        console.error('Auth verify error:', err)
        router.push('/login')
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


