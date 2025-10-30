'use client'

import { useEffect, useState } from 'react'

export default function AdminOverviewPage() {
  const [stats, setStats] = useState([])
  const [soft, setSoft] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/overview', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (isMounted) {
          setStats(json.stats || [])
          setSoft(json.soft || [])
        }
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

  if (error) return <div className="text-red-600 p-4">Error: {error}</div>

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-2">Model Performance Summary</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {stats?.map((s) => (
            <div key={s.model_version} className="bg-white shadow p-4 rounded-xl">
              <div className="font-medium">{s.model_version}</div>
              <div className="text-sm text-gray-500">Last updated {new Date(s.updated_at).toLocaleString()}</div>
              <div className="mt-3 text-sm">
                <p>Accept rate: <strong>{(s.accept_rate * 100).toFixed(1)}%</strong></p>
                <p>Softmatch ratio: <strong>{(s.softmatch_ratio * 100).toFixed(1)}%</strong></p>
              </div>
            </div>
          )) || <p className="text-gray-500">No data available</p>}
          {loading && <p className="text-gray-500">Loading...</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recent Soft Matches</h2>
        <ul className="bg-white shadow rounded-xl divide-y">
          {soft?.map((r, i) => (
            <li key={i} className="p-3 text-sm">
              <div>{r.new_text}</div>
              <div className="text-gray-500 text-xs">
                sim {r.similarity?.toFixed(3)} • {r.source_doc}
              </div>
            </li>
          )) || <p className="p-3 text-gray-500">No soft matches yet</p>}
          {loading && <li className="p-3 text-sm text-gray-500">Loading...</li>}
        </ul>
      </section>
    </div>
  )
}
