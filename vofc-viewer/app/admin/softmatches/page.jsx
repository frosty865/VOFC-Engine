'use client'

import { useEffect, useState } from 'react'

export default function SoftmatchesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/softmatches', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (isMounted) setRows(Array.isArray(data) ? data : [])
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

  if (error) return <div className="text-red-600 p-4">Error loading soft matches: {error}</div>

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Recent Soft Matches</h2>
      <div className="bg-white shadow rounded-xl overflow-y-auto max-h-[75vh]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 sticky top-0">
            <tr>
              <th className="p-3 text-left">Text</th>
              <th className="p-3 text-right">Similarity</th>
              <th className="p-3 text-left">Source Doc</th>
              <th className="p-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3 max-w-md text-gray-800">{r.new_text}</td>
                <td className="p-3 text-right">{r.similarity?.toFixed(3)}</td>
                <td className="p-3">{r.source_doc}</td>
                <td className="p-3 text-right text-gray-500">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            )) || (
              <tr>
                <td className="p-3" colSpan="4">
                  <p className="text-gray-500">No soft match data yet.</p>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="p-3" colSpan={4}>
                  <p className="text-gray-500">Loading...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


