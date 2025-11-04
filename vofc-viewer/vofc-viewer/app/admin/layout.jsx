'use client'

import RoleGate from '@/components/RoleGate'
import Link from 'next/link'
import '../../styles/cisa.css'

function AdminLayout({ children }) {
  return (
    <RoleGate>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--cisa-gray-lighter)' }}>
        <header style={{
          background: 'linear-gradient(135deg, var(--cisa-blue) 0%, var(--cisa-blue-light) 100%)',
          color: 'var(--cisa-white)',
          padding: 'var(--spacing-lg) 0',
          boxShadow: 'var(--shadow-md)',
          borderBottom: '3px solid var(--cisa-blue-lighter)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h1 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 700,
              margin: 0,
              color: 'var(--cisa-white)'
            }}>VOFC Admin Dashboard</h1>
            <nav style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <Link href="/admin" style={{
                color: 'var(--cisa-white)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
              }}>Overview</Link>
              <Link href="/admin/review" style={{
                color: 'var(--cisa-white)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
              }}>Review</Link>
              <Link href="/admin/models" style={{
                color: 'var(--cisa-white)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
              }}>Models</Link>
              <Link href="/admin/softmatches" style={{
                color: 'var(--cisa-white)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
              }}>Soft Matches</Link>
              <Link href="/admin/system" style={{
                color: 'var(--cisa-white)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
              }}>System</Link>
              <Link href="/dashboard" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--cisa-white)'
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'rgba(255, 255, 255, 0.8)'
                e.target.style.backgroundColor = 'transparent'
              }}>Return to User</Link>
            </nav>
          </div>
        </header>

        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'var(--spacing-xl) var(--spacing-lg)'
        }}>{children}</main>
      </div>
    </RoleGate>
  )
}

export default AdminLayout


