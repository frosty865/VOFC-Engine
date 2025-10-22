'use client';
import { useState, useEffect } from 'react';

export default function SubmissionReview() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadSubmissions();
    loadStats();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approve/pending');
      const data = await response.json();
      
      if (data.success) {
        setSubmissions(data.submissions);
      } else {
        setError(data.error || 'Failed to load submissions');
      }
    } catch (err) {
      setError('Error loading submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/approve/stats/overview');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const approveSubmission = async (submissionId) => {
    try {
      const response = await fetch(`/api/approve/${submissionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approver: 'admin@vofc.gov' // TODO: Get from auth context
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Submission approved successfully!');
        loadSubmissions();
        loadStats();
      } else {
        alert('Error approving submission: ' + data.error);
      }
    } catch (err) {
      alert('Error approving submission: ' + err.message);
    }
  };

  const rejectSubmission = async (submissionId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/approve/${submissionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejected_by: 'admin@vofc.gov', // TODO: Get from auth context
          rejection_reason: reason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Submission rejected');
        loadSubmissions();
        loadStats();
      } else {
        alert('Error rejecting submission: ' + data.error);
      }
    } catch (err) {
      alert('Error rejecting submission: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="card text-center py-8">
        <div className="loading"></div>
        <p className="text-secondary mt-3">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary">{stats.total || 0}</div>
          <div className="text-secondary">Total Submissions</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-warning">{stats.pending || 0}</div>
          <div className="text-secondary">Pending Review</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-success">{stats.approved || 0}</div>
          <div className="text-secondary">Approved</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-error">{stats.rejected || 0}</div>
          <div className="text-secondary">Rejected</div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        <h2 className="card-title">Pending Submissions</h2>
        
        {submissions.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-secondary">No pending submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onSelect={() => setSelectedSubmission(submission)}
                onApprove={() => approveSubmission(submission.id)}
                onReject={() => rejectSubmission(submission.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={() => {
            approveSubmission(selectedSubmission.id);
            setSelectedSubmission(null);
          }}
          onReject={() => {
            rejectSubmission(selectedSubmission.id);
            setSelectedSubmission(null);
          }}
        />
      )}
    </div>
  );
}

function SubmissionCard({ submission, onSelect, onApprove, onReject }) {
  const source = submission.data?.source || {};
  const entries = submission.data?.entries || [];

  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="card-title">
            {source.title || 'Untitled Document'}
          </h3>
          <div className="text-sm text-secondary mt-1">
            <div>Source: {source.source_type || 'Unknown'} • {source.year || 'Unknown Year'}</div>
            <div>Uploaded by: {submission.uploaded_by} • {formatDate(submission.created_at)}</div>
            <div>Entries: {entries.length} vulnerability/OFC pairs</div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          <button
            onClick={onSelect}
            className="btn btn-sm btn-primary"
          >
            Review
          </button>
          <button
            onClick={onApprove}
            className="btn btn-sm btn-success"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="btn btn-sm btn-error"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionDetailModal({ submission, onClose, onApprove, onReject }) {
  const source = submission.data?.source || {};
  const entries = submission.data?.entries || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="card-header">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="card-title">
                  {source.title || 'Untitled Document'}
                </h2>
                <div className="text-sm text-secondary mt-2">
                  <div>Source: {source.source_type || 'Unknown'} • {source.year || 'Unknown Year'}</div>
                  <div>Authors: {source.authors?.join(', ') || 'Unknown'}</div>
                  <div>Uploaded by: {submission.uploaded_by} • {formatDate(submission.created_at)}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-secondary hover:text-primary text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Entries */}
          <div className="space-y-4">
            <h3 className="card-title">Vulnerability & OFC Entries ({entries.length})</h3>
            
            {entries.map((entry, index) => (
              <div key={entry.id || index} className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vulnerability */}
                  {entry.vulnerability && (
                    <div>
                      <h4 className="font-semibold text-error mb-2">Vulnerability</h4>
                      <p className="text-secondary">{entry.vulnerability}</p>
                    </div>
                  )}
                  
                  {/* OFC */}
                  {entry.ofc && (
                    <div>
                      <h4 className="font-semibold text-success mb-2">Option for Consideration</h4>
                      <p className="text-secondary">{entry.ofc}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 text-sm text-secondary">
                  <div>Category: {entry.category} • Sector: {entry.sector} • Subsector: {entry.subsector}</div>
                  {entry.citations && entry.citations.length > 0 && (
                    <div>Citations: {entry.citations.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              className="btn btn-error"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="btn btn-success"
            >
              Approve & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
