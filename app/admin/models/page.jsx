'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../../lib/fetchWithAuth'

export default function ModelsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/dashboard/models', { cache: 'no-store' })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (isMounted) {
          setRows(Array.isArray(data) ? data : [])
          if (data.length === 0 && res.ok) {
            // View might not exist yet, show helpful message
            setError(null) // Not an error, just no data
          }
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message)
          console.error('Model learning overview error:', e)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Model Learning Overview</h2>
      
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Note: {error}</p>
          <p className="text-sm mt-1">
            The learning overview view may not be populated yet. Data will appear as submissions are processed and reviewed.
          </p>
        </div>
      )}

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">Model</th>
              <th className="p-3 text-right">Accept Rate</th>
              <th className="p-3 text-right">Edit Rate</th>
              <th className="p-3 text-right">Softmatches</th>
              <th className="p-3 text-right">Soft Ratio</th>
              <th className="p-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-6 text-center" colSpan={6}>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-gray-500">Loading model data...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center" colSpan={6}>
                  <p className="text-gray-500">No model learning data available yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Learning data will appear once submissions are reviewed and models are updated
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.model_version} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono">{s.model_version}</td>
                  <td className="p-3 text-right">{(s.accept_rate * 100).toFixed(1)}%</td>
                  <td className="p-3 text-right">{(s.avg_edits * 100).toFixed(1)}%</td>
                  <td className="p-3 text-right">{s.softmatch_count || 0}</td>
                  <td className="p-3 text-right">{(s.softmatch_ratio * 100).toFixed(1)}%</td>
                  <td className="p-3 text-right text-gray-500">
                    {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
