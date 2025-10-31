'use client'

import RoleGate from '@/components/RoleGate'
import Link from 'next/link'

export default function AdminLayout({ children }) {
  return (
    <RoleGate>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <header className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold">VOFC Admin Dashboard</h1>
            <nav className="space-x-4 text-sm font-medium">
              <Link href="/admin" className="hover:text-blue-600">Overview</Link>
              <Link href="/admin/models" className="hover:text-blue-600">Models</Link>
              <Link href="/admin/softmatches" className="hover:text-blue-600">Soft Matches</Link>
              <Link href="/admin/system" className="hover:text-blue-600">System</Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">Return to User</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </div>
    </RoleGate>
  )
}


