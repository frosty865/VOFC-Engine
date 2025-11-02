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
        if (isMounted) {
          setStatus(data)
          setError(null)
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message)
          console.error('Error loading system status:', e)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000) // Refresh every 30 seconds
    return () => { isMounted = false; clearInterval(id) }
  }, [])

  const getStatusColor = (serviceStatus) => {
    switch (serviceStatus) {
      case 'online': return 'bg-green-500'
      case 'active': return 'bg-green-500'
      case 'running': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'offline': return 'bg-red-500'
      case 'unavailable': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBadge = (serviceStatus) => {
    switch (serviceStatus) {
      case 'online':
      case 'active':
      case 'running': return 'text-green-700 bg-green-100'
      case 'warning': return 'text-yellow-700 bg-yellow-100'
      case 'error':
      case 'offline': return 'text-red-700 bg-red-100'
      case 'unavailable': return 'text-gray-700 bg-gray-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading system status...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Error loading system status: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!status) {
    return <div className="p-4 text-gray-600">No system status data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
        <p className="text-sm text-gray-500">
          Last updated: {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'Never'}
        </p>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Flask Server */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Flask Server (Python)</h3>
            <span className={`w-3 h-3 rounded-full ${getStatusColor(status.services?.flask?.status)}`}></span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Status: <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(status.services?.flask?.status)}`}>
              {status.services?.flask?.status || 'Unknown'}
            </span>
          </p>
          {status.services?.flask?.error && (
            <p className="text-xs text-red-600 mt-1">{status.services.flask.error}</p>
          )}
          {status.python?.model && status.python.model !== 'unknown' && (
            <p className="text-xs text-gray-500 mt-1">Model: {status.python.model}</p>
          )}
        </div>

        {/* Ollama API */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Ollama API</h3>
            <span className={`w-3 h-3 rounded-full ${getStatusColor(status.services?.ollama?.status)}`}></span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Status: <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(status.services?.ollama?.status)}`}>
              {status.services?.ollama?.status || 'Unknown'}
            </span>
          </p>
          {status.services?.ollama?.models_count && (
            <p className="text-xs text-gray-500 mt-1">{status.services.ollama.models_count} model(s) available</p>
          )}
        </div>

        {/* Supabase */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Supabase</h3>
            <span className={`w-3 h-3 rounded-full ${getStatusColor(status.services?.supabase?.status)}`}></span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Status: <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(status.services?.supabase?.status)}`}>
              {status.services?.supabase?.status || 'Unknown'}
            </span>
          </p>
        </div>
      </div>

      {/* File Processing Status */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Processing Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-3xl font-bold text-yellow-700">{status.files?.incoming || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Incoming Files</p>
            <p className="text-xs text-gray-500">Awaiting processing</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-3xl font-bold text-blue-700">{status.files?.library || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Processed Files</p>
            <p className="text-xs text-gray-500">In library</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-3xl font-bold text-green-700">{status.files?.extracted_text || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Extracted Text</p>
            <p className="text-xs text-gray-500">Ready for analysis</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-3xl font-bold text-red-700">{status.files?.errors || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Errors</p>
            <p className="text-xs text-gray-500">Failed processing</p>
          </div>
        </div>
        
        {/* Processing Status */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Processing Status</p>
              <p className="text-xs text-gray-500">
                Active Jobs: {status.processing?.active_jobs || 0} | 
                Ready: {status.processing?.ready ? 'Yes' : 'No'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.processing?.ready ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {status.processing?.ready ? 'Ready' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Parsing & Processing Statistics */}
      {status.parsing && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Parsing & Processing Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{status.parsing.total_submissions || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Total Submissions</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{status.parsing.pending_review || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Pending Review</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{status.parsing.approved || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Approved</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{status.parsing.rejected || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Rejected</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{status.parsing.total_vulnerabilities || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Vulnerabilities</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-700">{status.parsing.total_ofcs || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Options for Consideration</p>
            </div>
          </div>

          {/* Recent Processing Activity */}
          {status.parsing.recent_submissions && status.parsing.recent_submissions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Processing Activity</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {status.parsing.recent_submissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        sub.status === 'approved' ? 'bg-green-500' :
                        sub.status === 'rejected' ? 'bg-red-500' :
                        sub.status === 'pending_review' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}></span>
                      <span className="font-mono text-xs">{sub.id.slice(0, 8)}...</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                        sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        sub.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(sub.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learning Statistics */}
      {status.learning && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning System</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{status.learning.total_events || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Total Learning Events</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{status.learning.approved_events || 0}</p>
              <p className="text-xs text-gray-600 mt-1">Approved Events</p>
            </div>
          </div>
        </div>
      )}

      {/* Python Runtime Info */}
      {status.python && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Python Runtime</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Model:</p>
              <p className="font-medium">{status.python.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Version:</p>
              <p className="font-medium">{status.python.version || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Runtime:</p>
              <p className={`font-medium ${status.python.runtime_status === 'running' ? 'text-green-600' : 'text-gray-600'}`}>
                {status.python.runtime_status || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
