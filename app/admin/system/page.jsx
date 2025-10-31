'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../../lib/fetchWithAuth'

export default function SystemStatusPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/dashboard/system', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (isMounted) setStatus(data)
      } catch (e) {
        if (isMounted) setError(e.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  if (error) return <div className="text-red-600 p-4">Error loading system status: {error}</div>
  if (loading) return <div className="p-4 text-gray-600">Loading system status...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">System Health</h2>
      <div className="bg-white shadow p-4 rounded-xl text-sm">
        <pre className="whitespace-pre-wrap">
          {status ? JSON.stringify(status, null, 2) : 'No data available'}
        </pre>
      </div>
    </div>
  )
}
