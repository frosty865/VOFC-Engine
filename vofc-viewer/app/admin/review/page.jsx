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
    if (!confirm('Approve this submission? This will:\n- Add data to production tables\n- Feed the learning algorithm\n- Mark as approved')) {
      return
    }
    
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
      alert('✅ Submission approved! Data moved to production and learning algorithm notified.')
    } catch (e) {
      alert('❌ Error approving submission: ' + e.message)
    }
  }

  const handleReject = async (submissionId, reason) => {
    const rejectionReason = reason || prompt('Reason for rejection (optional):')
    if (rejectionReason === null && !reason) return // User cancelled prompt
    
    if (!confirm(`Reject this submission?\nReason: ${rejectionReason || 'None provided'}\n\nThis will mark the submission as rejected and remove it from the review queue.`)) {
      return
    }
    
    try {
      const res = await fetchWithAuth(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          comments: rejectionReason || 'Rejected by admin' 
        })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to reject' }))
        throw new Error(errorData.error || 'Failed to reject')
      }
      await loadSubmissions()
      alert('✅ Submission rejected and removed from review queue.')
    } catch (e) {
      alert('❌ Error rejecting submission: ' + e.message)
    }
  }

  return (
    <RoleGate>
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Review Submissions</h1>
          <p className="text-gray-600 mt-2">Review vulnerabilities and their associated OFCs. Approve to feed learning algorithm and move to production.</p>
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
          <div className="space-y-6">
            {submissions.map((submission) => {
              // Parse submission data once for the entire component
              let data = {};
              try {
                if (submission.data) {
                  data = typeof submission.data === 'string' 
                    ? JSON.parse(submission.data) 
                    : submission.data;
                }
              } catch (parseError) {
                console.error('Error parsing submission data:', parseError, submission.id);
                data = {};
              }

              // Debug: Log the data structure
              console.log('🔍 Submission data structure:', {
                id: submission.id,
                hasVulns: !!data.vulnerabilities,
                hasOfcs: !!data.ofcs,
                vulnCount: Array.isArray(data.vulnerabilities) ? data.vulnerabilities.length : (data.vulnerabilities_count || 0),
                ofcCount: Array.isArray(data.ofcs) ? data.ofcs.length : (data.ofcs_count || 0),
                dataKeys: Object.keys(data),
                dataType: typeof data,
                fullData: data // Log full data for debugging
              });
              
              // Extract vulnerabilities - handle multiple possible structures
              let vulnerabilities = [];
              if (Array.isArray(data.vulnerabilities)) {
                vulnerabilities = data.vulnerabilities;
              } else if (data.vulnerabilities && typeof data.vulnerabilities === 'object') {
                // If it's an object, try to convert to array
                vulnerabilities = Object.values(data.vulnerabilities);
              }

              // Extract OFCs - handle multiple possible structures
              let ofcs = [];
              if (Array.isArray(data.ofcs)) {
                ofcs = data.ofcs;
              } else if (data.ofcs && typeof data.ofcs === 'object') {
                // If it's an object, try to convert to array
                ofcs = Object.values(data.ofcs);
              } else if (Array.isArray(data.options_for_consideration)) {
                // Alternative field name
                ofcs = data.options_for_consideration;
              }

              // Also check if OFCs are nested within vulnerabilities
              if (vulnerabilities.length > 0 && ofcs.length === 0) {
                vulnerabilities.forEach(vuln => {
                  if (vuln.options_for_consideration && Array.isArray(vuln.options_for_consideration)) {
                    vuln.options_for_consideration.forEach(ofc => {
                      ofcs.push({
                        ...ofc,
                        linked_vulnerability: vuln.id || vuln.title || vuln.vulnerability
                      });
                    });
                  }
                });
              }

              const hasData = vulnerabilities.length > 0 || ofcs.length > 0;
              // Only show "Load Data" if we have counts but no actual data (indicates old submission or missing data)
              // New submissions should already have full data stored
              const needsDataLoad = !hasData && 
                ((data.vulnerabilities_count > 0) || (data.ofcs_count > 0)) &&
                (data.vulnerabilities_count > 0 || data.ofcs_count > 0);

              console.log('Extracted data:', {
                vulnerabilities: vulnerabilities.length,
                ofcs: ofcs.length,
                needsDataLoad,
                reason: needsDataLoad ? 'Has counts but no full data - likely old submission' : 'Full data present or no data at all'
              });

              // Group OFCs by their linked vulnerability
              // First, try to match by ID, then by title/text matching
              const ofcsByVuln = {};
              ofcs.forEach(ofc => {
                let vulnId = 'unlinked';
                
                // Try direct ID match
                if (ofc.linked_vulnerability) {
                  const matchedVuln = vulnerabilities.find(v => 
                    v.id === ofc.linked_vulnerability || 
                    v.title === ofc.linked_vulnerability ||
                    v.vulnerability === ofc.linked_vulnerability
                  );
                  if (matchedVuln) {
                    vulnId = matchedVuln.id || matchedVuln.title || matchedVuln.vulnerability || 'unlinked';
                  }
                }
                
                // If still unlinked, try matching by other fields
                if (vulnId === 'unlinked' && (ofc.vulnerability_id || ofc.vuln_id)) {
                  const matchId = ofc.vulnerability_id || ofc.vuln_id;
                  const matchedVuln = vulnerabilities.find(v => 
                    v.id === matchId || 
                    v.title === matchId ||
                    v.vulnerability === matchId
                  );
                  if (matchedVuln) {
                    vulnId = matchedVuln.id || matchedVuln.title || matchedVuln.vulnerability || 'unlinked';
                  }
                }
                
                if (!ofcsByVuln[vulnId]) {
                  ofcsByVuln[vulnId] = [];
                }
                ofcsByVuln[vulnId].push(ofc);
              });

              return (
              <div key={submission.id} className="bg-white rounded-lg shadow-lg border border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Submission: {submission.id.slice(0, 8)}...
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Document:</span> {data?.document_name || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(submission.created_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> <span className="capitalize">{submission.type}</span>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending Review</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {needsDataLoad && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetchWithAuth(`/api/admin/submissions/${submission.id}/update-data`, {
                                method: 'POST'
                              });
                              if (res.ok) {
                                alert('✅ Submission data loaded from JSON file successfully!');
                                loadSubmissions();
                              } else {
                                const error = await res.json();
                                alert('❌ Error: ' + (error.error || 'Failed to load data'));
                              }
                            } catch (e) {
                              alert('❌ Error: ' + e.message);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                          title="This submission was created before we started storing full data. Click to load from JSON file."
                        >
                          📥 Load Data (Legacy)
                        </button>
                      )}
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md"
                        title="Approve submission - moves to production and feeds learning algorithm"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md"
                        title="Reject submission - marks as rejected and removes from queue"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Summary Stats */}
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium mb-1">Vulnerabilities</div>
                      <div className="text-2xl font-bold text-blue-900">{vulnerabilities.length || data?.vulnerabilities_count || 0}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium mb-1">Options for Consideration</div>
                      <div className="text-2xl font-bold text-purple-900">{ofcs.length || data?.ofcs_count || 0}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-sm text-green-600 font-medium mb-1">Linked OFCs</div>
                      <div className="text-2xl font-bold text-green-900">{Object.keys(ofcsByVuln).filter(k => k !== 'unlinked').length}</div>
                    </div>
                  </div>

                  {/* Warning if data needs loading (only for legacy submissions) */}
                  {needsDataLoad && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium mb-1">
                        ⚠️ Legacy Submission Detected
                      </p>
                      <p className="text-xs text-yellow-700">
                        This submission was created before we started storing full extraction data in the database. 
                        The submission has {data.vulnerabilities_count || 0} vulnerabilities and {data.ofcs_count || 0} OFCs according to metadata, 
                        but the full details are stored in the JSON file. Click "Load Data (Legacy)" above to fetch the complete data.
                      </p>
                    </div>
                  )}

                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-3 bg-gray-100 rounded text-xs font-mono">
                      <strong>Debug:</strong> Vulnerabilities={vulnerabilities.length}, OFCs={ofcs.length}, 
                      DataKeys={Object.keys(data).join(', ')}, 
                      HasVulns={!!data.vulnerabilities ? 'yes' : 'no'},
                      HasOfcs={!!data.ofcs ? 'yes' : 'no'}
                    </div>
                  )}

                  {/* Vulnerabilities with their OFCs */}
                  {vulnerabilities && vulnerabilities.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Vulnerabilities and Associated OFCs ({vulnerabilities.length} total)
                      </h4>
                      <div className="mb-2 text-xs text-gray-500">
                        Showing {vulnerabilities.length} vulnerability/vulnerabilities with their associated options for consideration
                      </div>
                      <div className="space-y-6 max-h-[600px] overflow-y-auto">
                        {vulnerabilities.map((vuln, idx) => {
                          console.log(`🔍 Rendering vulnerability ${idx}:`, {
                            vuln,
                            vulnId: vuln.id,
                            vulnTitle: vuln.title,
                            vulnVulnerability: vuln.vulnerability,
                            hasOptions: !!vuln.options_for_consideration,
                            optionsCount: vuln.options_for_consideration?.length || 0
                          });
                          // Try multiple ways to match vulnerability ID
                          const vulnId = vuln.id || vuln.title || vuln.vulnerability || `vuln-${idx}`;
                          const vulnKey = vuln.id || vuln.title || vuln.vulnerability || `vuln-${idx}`;
                          
                          // Find OFCs linked to this vulnerability by multiple methods
                          const linkedOfcs = [
                            ...(ofcsByVuln[vulnId] || []),
                            ...(ofcsByVuln[vulnKey] || []),
                            ...(ofcsByVuln[vuln.id] || []),
                            ...(ofcsByVuln[vuln.title] || []),
                            ...(ofcsByVuln[vuln.vulnerability] || [])
                          ];
                          
                          // Remove duplicates
                          const uniqueLinkedOfcs = linkedOfcs.filter((ofc, index, self) =>
                            index === self.findIndex(o => 
                              (o.id && o.id === ofc.id) || 
                              (o.title && o.title === ofc.title) ||
                              (o.option && o.option === ofc.option)
                            )
                          );
                          
                          return (
                            <div key={vulnId} className="border border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                              {/* Vulnerability Header */}
                              <div className="mb-3 pb-3 border-b border-gray-300">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                                        VULNERABILITY #{idx + 1}
                                      </span>
                                      {vuln.category && (
                                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                                          {vuln.category}
                                        </span>
                                      )}
                                      {vuln.severity && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                          {vuln.severity}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-base font-bold text-gray-900 mt-2">
                                      {vuln.title || vuln.vulnerability || 'Untitled Vulnerability'}
                                    </h5>
                                    {vuln.description && (
                                      <p className="text-sm text-gray-600 mt-2">{vuln.description}</p>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 ml-4">
                                    {uniqueLinkedOfcs.length} OFC{uniqueLinkedOfcs.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>

                              {/* Associated OFCs */}
                              {uniqueLinkedOfcs.length > 0 ? (
                                <div className="ml-4 pl-4 border-l-2 border-blue-400">
                                  <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                                    Options for Consideration ({uniqueLinkedOfcs.length})
                                  </div>
                                  <div className="space-y-2">
                                    {uniqueLinkedOfcs.map((ofc, ofcIdx) => (
                                      <div key={ofc.id || `ofc-${idx}-${ofcIdx}`} className="bg-white rounded p-3 border border-blue-200 shadow-sm">
                                        <div className="font-medium text-sm text-gray-900">
                                          {ofc.title || ofc.option || ofc.name || 'Untitled OFC'}
                                        </div>
                                        {ofc.description && (
                                          <div className="text-xs text-gray-600 mt-1">{ofc.description}</div>
                                        )}
                                        {!ofc.title && !ofc.option && typeof ofc === 'string' && (
                                          <div className="text-xs text-gray-600 mt-1">{ofc}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="ml-4 pl-4 border-l-2 border-gray-300">
                                  <div className="text-xs text-gray-400 italic">No OFCs linked to this vulnerability</div>
                                  {ofcs.length > 0 && (
                                    <div className="text-xs text-yellow-600 mt-1">
                                      (Note: {ofcs.length} OFC{ofcs.length !== 1 ? 's' : ''} found but not linked to this vulnerability)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : vulnerabilities.length === 0 && ofcs.length > 0 ? (
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Options for Consideration (Not Linked to Vulnerabilities)
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {ofcs.map((ofc, idx) => (
                          <div key={ofc.id || `ofc-${idx}`} className="bg-white rounded p-3 border border-purple-200">
                            <div className="font-medium text-sm text-gray-900">
                              {ofc.title || ofc.option || ofc.name || 'Untitled OFC'}
                            </div>
                            {ofc.description && (
                              <div className="text-xs text-gray-600 mt-1">{ofc.description}</div>
                            )}
                            <div className="text-xs text-purple-600 mt-1 italic">
                              ⚠️ Not linked to any vulnerability
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
                      {needsDataLoad 
                        ? 'Click "Load Data" to view vulnerabilities and OFCs'
                        : 'No vulnerabilities or OFCs extracted from this submission'}
                      {vulnerabilities.length === 0 && ofcs.length === 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          Check console logs for data structure details
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unlinked OFCs */}
                  {ofcsByVuln['unlinked'] && ofcsByVuln['unlinked'].length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-300">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Unlinked Options for Consideration ({ofcsByVuln['unlinked'].length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {ofcsByVuln['unlinked'].map((ofc, idx) => (
                          <div key={ofc.id || `unlinked-${idx}`} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <div className="font-medium text-sm text-gray-900">
                              {ofc.title || ofc.option || 'Untitled OFC'}
                            </div>
                            {ofc.description && (
                              <div className="text-xs text-gray-600 mt-1">{ofc.description}</div>
                            )}
                            <div className="text-xs text-yellow-700 mt-1 italic">
                              ⚠️ Not linked to any vulnerability
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Data (collapsible) */}
                  <details className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <summary className="font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                      📋 View Raw Submission Data
                    </summary>
                    <pre className="text-xs text-gray-700 overflow-x-auto mt-3 max-h-96 overflow-y-auto">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  )
}
