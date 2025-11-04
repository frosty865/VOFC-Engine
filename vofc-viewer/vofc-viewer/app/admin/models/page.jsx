'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../../lib/fetchWithAuth'
import '@/styles/cisa.css'

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
            setError(null)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--cisa-blue)' }}>Model Learning Overview</h2>
      
      {error && (
        <div className="alert alert-warning">
          <p style={{ fontWeight: 600, margin: 0, marginBottom: 'var(--spacing-xs)' }}>Note: {error}</p>
          <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
            The learning overview view may not be populated yet. Data will appear as submissions are processed and reviewed.
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Model</th>
              <th style={{ textAlign: 'right' }}>Accept Rate</th>
              <th style={{ textAlign: 'right' }}>Edit Rate</th>
              <th style={{ textAlign: 'right' }}>Softmatches</th>
              <th style={{ textAlign: 'right' }}>Soft Ratio</th>
              <th style={{ textAlign: 'right' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }} colSpan={6}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid var(--cisa-gray-light)',
                      borderTopColor: 'var(--cisa-blue)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: 'var(--spacing-sm)'
                    }}></div>
                    <span style={{ color: 'var(--cisa-gray)' }}>Loading model data...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }} colSpan={6}>
                  <p style={{ color: 'var(--cisa-gray)', margin: 0 }}>No model learning data available yet</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)', opacity: 0.7, marginTop: 'var(--spacing-sm)' }}>
                    Learning data will appear once submissions are reviewed and models are updated
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.model_version}>
                  <td style={{ fontFamily: 'monospace' }}>{s.model_version}</td>
                  <td style={{ textAlign: 'right' }}>{(s.accept_rate * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }}>{(s.avg_edits * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }}>{s.softmatch_count || 0}</td>
                  <td style={{ textAlign: 'right' }}>{(s.softmatch_ratio * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'right', color: 'var(--cisa-gray)' }}>
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
