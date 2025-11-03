'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/fetchWithAuth'
import '../../styles/cisa.css'
import Link from 'next/link'

export default function AdminOverviewPage() {
  const [stats, setStats] = useState([])
  const [soft, setSoft] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/dashboard/overview', { cache: 'no-store' })
        
        // Log response status for debugging
        if (!res.ok) {
          const errorText = await res.text()
          console.error(`[Admin Overview] API error: ${res.status}`, errorText.substring(0, 200))
          throw new Error(`HTTP ${res.status}: ${res.status === 401 ? 'Unauthorized' : res.status === 403 ? 'Forbidden' : 'Server Error'}`)
        }
        
        const json = await res.json()
        if (isMounted) {
          setStats(json.stats || [])
          setSoft(json.soft || [])
          setError(null) // Clear any previous errors
        }
      } catch (e) {
        console.error('[Admin Overview] Load error:', e)
        if (isMounted) {
          setError(e.message)
          // If unauthorized, redirect might be handled by RoleGate
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  if (error) return (
    <div className="alert alert-danger" style={{ 
      padding: 'var(--spacing-lg)', 
      backgroundColor: '#fee', 
      border: '1px solid #f00',
      borderRadius: 'var(--border-radius)',
      marginBottom: 'var(--spacing-lg)'
    }}>
      <h3 style={{ margin: '0 0 var(--spacing-sm) 0', color: '#c00' }}>Error Loading Admin Data</h3>
      <p style={{ margin: 0, color: '#800' }}>{error}</p>
      <p style={{ margin: 'var(--spacing-sm) 0 0 0', fontSize: 'var(--font-size-sm)', color: '#666' }}>
        This may indicate an authentication issue. Check the browser console for details.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <section>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-md)' }}>Model Performance Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {stats?.map((s) => (
            <div key={s.model_version} className="card">
              <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>{s.model_version}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)', marginBottom: 'var(--spacing-md)' }}>
                Last updated {new Date(s.updated_at).toLocaleString()}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <p style={{ margin: 'var(--spacing-xs) 0' }}>Accept rate: <strong>{(s.accept_rate * 100).toFixed(1)}%</strong></p>
                <p style={{ margin: 'var(--spacing-xs) 0' }}>Softmatch ratio: <strong>{(s.softmatch_ratio * 100).toFixed(1)}%</strong></p>
              </div>
            </div>
          )) || <p style={{ color: 'var(--cisa-gray)' }}>No data available</p>}
          {loading && <p style={{ color: 'var(--cisa-gray)' }}>Loading...</p>}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-md)' }}>Admin Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Link href="/admin/users" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>User Management</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Add, activate, and manage users</div>
          </Link>
          <Link href="/admin/review" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>Review Submissions</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Moderate new content</div>
          </Link>
          <Link href="/admin/models" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>Model Analytics</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Accept rate, edits, softmatch ratio</div>
          </Link>
          <Link href="/admin/softmatches" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>Soft Match Audit</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Near-duplicate detections</div>
          </Link>
          <Link href="/admin/system" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>System Health</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Backend and Ollama status</div>
          </Link>
          <Link href="/learning" className="card" style={{ textDecoration: 'none', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-xs)' }}>Learning Monitor</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Continuous learning overview</div>
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--cisa-blue)', marginBottom: 'var(--spacing-md)' }}>Recent Soft Matches</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {soft?.map((r, i) => (
              <li key={i} style={{
                padding: 'var(--spacing-md)',
                borderBottom: i < soft.length - 1 ? '1px solid var(--cisa-gray-light)' : 'none',
                fontSize: 'var(--font-size-sm)'
              }}>
                <div style={{ color: 'var(--cisa-black)', marginBottom: 'var(--spacing-xs)' }}>{r.new_text}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--cisa-gray)' }}>
                  sim {r.similarity?.toFixed(3)} • {r.source_doc}
                </div>
              </li>
            )) || <li style={{ padding: 'var(--spacing-md)', color: 'var(--cisa-gray)' }}>No soft matches yet</li>}
            {loading && <li style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--cisa-gray)' }}>Loading...</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}
