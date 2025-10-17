'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [userSubmissions, setUserSubmissions] = useState([]);
    const [returnedSubmissions, setReturnedSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const router = useRouter();

    useEffect(() => {
        checkAuth();
        loadUserData();
    }, []);

    const checkAuth = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                router.push('/splash');
                return;
            }
            setUser(currentUser);
        } catch (error) {
            console.error('Auth check failed:', error);
            router.push('/splash');
        }
    };

    const loadUserData = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) return;

            // Get user profile
            const userProfile = await getUserProfile();
            setProfile(userProfile);

            // Get user's active submissions (from submissions table)
            const { data: submissions, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('submitter_email', currentUser.email || '')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading submissions:', error);
                return;
            }

            setUserSubmissions(submissions || []);

            // Get rejected submissions (from rejected_submissions table)
            const { data: rejectedSubmissions, error: rejectedError } = await supabase
                .from('rejected_submissions')
                .select('*')
                .eq('submitter_email', currentUser.email || '')
                .order('rejected_at', { ascending: false });

            if (rejectedError) {
                console.error('Error loading rejected submissions:', rejectedError);
                return;
            }

            setReturnedSubmissions(rejectedSubmissions || []);

        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResubmit = async (rejectedSubmissionId) => {
        try {
            // Use the resubmit_rejected_submission function
            const { data, error } = await supabase.rpc('resubmit_rejected_submission', {
                p_rejected_submission_id: rejectedSubmissionId
            });

            if (error) {
                console.error('Error resubmitting:', error);
                alert('Error resubmitting submission: ' + error.message);
                return;
            }

            const result = Array.isArray(data) ? data[0] : data;

            if (result.success) {
                alert('Submission resubmitted for review! New submission ID: ' + result.new_submission_id);
                loadUserData(); // Reload data
            } else {
                alert('Error resubmitting submission: ' + result.message);
            }
        } catch (error) {
            console.error('Error resubmitting:', error);
            alert('Error resubmitting submission');
        }
    };

    const handleDeleteSubmission = async (rejectedSubmissionId) => {
        if (!confirm('Are you sure you want to delete this rejected submission? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('rejected_submissions')
                .delete()
                .eq('id', rejectedSubmissionId);

            if (error) {
                console.error('Error deleting rejected submission:', error);
                alert('Error deleting submission');
                return;
            }

            alert('Rejected submission deleted successfully!');
            loadUserData(); // Reload data
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('Error deleting submission');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading profile...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Redirecting to login...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="card mb-6">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="card-title">User Profile</h1>
                            <p className="text-secondary">Welcome back, {user.full_name}</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => router.push('/')}
                                className="btn btn-secondary"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={() => router.push('/submit')}
                                className="btn btn-primary"
                            >
                                New Submission
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="card mb-6">
                <div className="card-header">
                    <h2 className="card-title">Profile Information</h2>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="form-control-plaintext">{user.full_name}</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <div className="form-control-plaintext">{user.username}</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <div className="form-control-plaintext">
                                    <span className={`badge ${user.role === 'admin' ? 'bg-danger' :
                                        user.role === 'spsa' ? 'bg-warning' :
                                            user.role === 'psa' ? 'bg-info' :
                                                'bg-success'
                                        } text-white`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Organization</label>
                                <div className="form-control-plaintext">{user.organization || 'Not specified'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card mb-6">
                <div className="card-header">
                    <div className="nav nav-tabs card-header-tabs">
                        <button
                            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'submissions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('submissions')}
                        >
                            My Submissions ({userSubmissions.length})
                        </button>
                        <button
                            className={`nav-link ${activeTab === 'returned' ? 'active' : ''}`}
                            onClick={() => setActiveTab('returned')}
                        >
                            Returned Submissions ({returnedSubmissions.length})
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div>
                            <div className="row">
                                <div className="col-md-3">
                                    <div className="card bg-primary text-white">
                                        <div className="card-body text-center">
                                            <div className="text-2xl font-bold">{userSubmissions.length}</div>
                                            <div className="text-sm">Total Submissions</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-success text-white">
                                        <div className="card-body text-center">
                                            <div className="text-2xl font-bold">
                                                {userSubmissions.filter(s => s.status === 'approved').length}
                                            </div>
                                            <div className="text-sm">Approved</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-warning text-white">
                                        <div className="card-body text-center">
                                            <div className="text-2xl font-bold">
                                                {userSubmissions.filter(s => s.status === 'pending_review').length}
                                            </div>
                                            <div className="text-sm">Pending Review</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-danger text-white">
                                        <div className="card-body text-center">
                                            <div className="text-2xl font-bold">
                                                {userSubmissions.filter(s => s.status === 'rejected').length}
                                            </div>
                                            <div className="text-sm">Returned</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submissions Tab */}
                    {activeTab === 'submissions' && (
                        <div>
                            {userSubmissions.length === 0 ? (
                                <div className="text-center py-8 text-secondary">
                                    <p>No submissions yet</p>
                                    <button
                                        onClick={() => router.push('/submit')}
                                        className="btn btn-primary mt-3"
                                    >
                                        Create First Submission
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {userSubmissions.map((submission) => {
                                        const data = typeof submission.data === 'string'
                                            ? JSON.parse(submission.data)
                                            : submission.data;

                                        return (
                                            <div key={submission.id} className="card">
                                                <div className="card-header">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="card-title text-lg">
                                                            {submission.type === 'vulnerability' ? 'Vulnerability' : 'OFC'} Submission
                                                        </h4>
                                                        <span className={`badge ${submission.status === 'pending_review' ? 'bg-warning' :
                                                            submission.status === 'approved' ? 'bg-success' :
                                                                submission.status === 'rejected' ? 'bg-danger' :
                                                                    'bg-secondary'
                                                            } text-white text-xs`}>
                                                            {submission.status === 'pending_review' ? 'Pending Review' :
                                                                submission.status === 'approved' ? 'Approved' :
                                                                    submission.status === 'rejected' ? 'Returned' :
                                                                        submission.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-3">
                                                        <h5 className="font-medium mb-2 text-sm">
                                                            {submission.type === 'vulnerability' ? 'Vulnerability:' : 'OFC:'}
                                                        </h5>
                                                        <p className="text-sm text-secondary">
                                                            {submission.type === 'vulnerability' ? data.vulnerability : data.option_text}
                                                        </p>
                                                    </div>

                                                    <div className="text-xs text-secondary space-y-1">
                                                        <div>Discipline: {data.discipline}</div>
                                                        <div>Source: {data.source || 'N/A'}</div>
                                                        <div>Submitted: {new Date(submission.created_at).toLocaleDateString()}</div>
                                                        {submission.comments && (
                                                            <div className="mt-2 p-2 bg-gray-50 rounded">
                                                                <strong>Review Comments:</strong> {submission.comments}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Returned Submissions Tab */}
                    {activeTab === 'returned' && (
                        <div>
                            {returnedSubmissions.length === 0 ? (
                                <div className="text-center py-8 text-secondary">
                                    <p>No returned submissions</p>
                                    <p className="text-sm">All your submissions have been approved or are pending review</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {returnedSubmissions.map((submission) => {
                                        const data = typeof submission.data === 'string'
                                            ? JSON.parse(submission.data)
                                            : submission.data;

                                        return (
                                            <div key={submission.id} className="card border-danger">
                                                <div className="card-header bg-danger text-white">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="card-title text-lg text-white">
                                                            {submission.type === 'vulnerability' ? 'Vulnerability' : 'OFC'} Submission
                                                        </h4>
                                                        <span className="badge bg-white text-danger">
                                                            Returned
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-3">
                                                        <h5 className="font-medium mb-2 text-sm">
                                                            {submission.type === 'vulnerability' ? 'Vulnerability:' : 'OFC:'}
                                                        </h5>
                                                        <p className="text-sm text-secondary">
                                                            {submission.type === 'vulnerability' ? data.vulnerability : data.option_text}
                                                        </p>
                                                    </div>

                                                    {submission.rejection_reason && (
                                                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                                                            <h6 className="font-medium text-red-800 mb-1">Rejection Reason:</h6>
                                                            <p className="text-sm text-red-700">{submission.rejection_reason}</p>
                                                        </div>
                                                    )}

                                                    <div className="text-xs text-secondary space-y-1 mb-3">
                                                        <div>Discipline: {data.discipline}</div>
                                                        <div>Source: {data.source || 'N/A'}</div>
                                                        <div>Submitted: {new Date(submission.created_at).toLocaleDateString()}</div>
                                                        <div>Rejected: {new Date(submission.rejected_at).toLocaleDateString()}</div>
                                                        {submission.resubmitted_at && (
                                                            <div>Resubmitted: {new Date(submission.resubmitted_at).toLocaleDateString()}</div>
                                                        )}
                                                    </div>

                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleResubmit(submission.id)}
                                                            className="btn btn-warning btn-sm"
                                                        >
                                                            Resubmit for Review
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSubmission(submission.id)}
                                                            className="btn btn-danger btn-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
