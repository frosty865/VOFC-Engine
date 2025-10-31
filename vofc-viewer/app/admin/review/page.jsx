'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../../lib/fetchWithAuth'
import RoleGate from '@/components/RoleGate'

export default function ReviewSubmissionsPage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSubmissions()
    const interval = setInterval(loadSubmissions, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSubmissions = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/submissions?status=pending_review', {
        cache: 'no-store'
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSubmissions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message)
      console.error('Error loading submissions:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId) => {
    try {
      const res = await fetchWithAuth(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to approve' }))
        throw new Error(errorData.error || 'Failed to approve')
      }
      await loadSubmissions()
      alert('Submission approved successfully!')
    } catch (e) {
      alert('Error approving submission: ' + e.message)
    }
  }

  const handleReject = async (submissionId, reason) => {
    try {
      const res = await fetchWithAuth(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          comments: reason || 'Rejected by admin' 
        })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to reject' }))
        throw new Error(errorData.error || 'Failed to reject')
      }
      await loadSubmissions()
      alert('Submission rejected successfully!')
    } catch (e) {
      alert('Error rejecting submission: ' + e.message)
    }
  }

  return (
    <RoleGate>
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Review Submissions</h1>
          <p className="text-gray-600 mt-2">Moderate and approve pending submissions</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No pending submissions to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Submission {submission.id.slice(0, 8)}...
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Created: {new Date(submission.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Type: <span className="font-medium">{submission.type}</span>
                    </p>
                    {submission.data && typeof submission.data === 'object' && submission.data.document_name && (
                      <p className="text-sm text-gray-500">
                        Document: <span className="font-medium">{submission.data.document_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(submission.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):')
                        if (reason !== null) handleReject(submission.id, reason)
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {submission.data && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Submission Data:</h4>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(
                        typeof submission.data === 'string'
                          ? JSON.parse(submission.data)
                          : submission.data,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGate>
  )
}

