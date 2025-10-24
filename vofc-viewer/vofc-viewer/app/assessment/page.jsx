'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';

export default function AssessmentPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setAuthenticated(true);
        setCurrentUser(user);
      } else {
        router.push('/splash');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/splash');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="text-center py-8">
            <div className="loading"></div>
            <p className="text-secondary mt-3">Loading assessment tools...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="card-header">
          <h1 className="card-title">Generate Assessment</h1>
          <p className="card-subtitle">
            Create comprehensive vulnerability assessments and reports
          </p>
        </div>

        {/* Coming Soon Section */}
        <div className="card text-center py-8">
          <div className="mb-4">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚧</div>
            <h2 className="card-title">Assessment Tools Coming Soon</h2>
            <p className="text-secondary mb-4">
              We're building powerful assessment generation tools to help you create comprehensive vulnerability reports.
            </p>
          </div>

          {/* Planned Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="card">
              <div className="text-center">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
                <h3 className="card-title">Risk Assessment</h3>
                <p className="text-secondary">
                  Generate comprehensive risk assessments based on vulnerability data
                </p>
              </div>
            </div>

            <div className="card">
              <div className="text-center">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                <h3 className="card-title">Compliance Reports</h3>
                <p className="text-secondary">
                  Create compliance reports for various security frameworks
                </p>
              </div>
            </div>

            <div className="card">
              <div className="text-center">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</div>
                <h3 className="card-title">Sector Analysis</h3>
                <p className="text-secondary">
                  Analyze vulnerabilities by sector and generate targeted assessments
                </p>
              </div>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card">
              <div className="text-center">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📈</div>
                <h3 className="card-title">Trend Analysis</h3>
                <p className="text-secondary">
                  Track vulnerability trends over time and identify patterns
                </p>
              </div>
            </div>

            <div className="card">
              <div className="text-center">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                <h3 className="card-title">Gap Analysis</h3>
                <p className="text-secondary">
                  Identify gaps in your security posture and recommend improvements
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {currentUser && (
            <div className="card">
              <div className="text-center">
                <h3 className="card-title">Welcome, {currentUser.full_name}</h3>
                <p className="text-secondary">
                  As a {currentUser.role}, you'll have access to advanced assessment tools when they become available.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <a href="/" className="btn btn-primary">
              📊 View Dashboard
            </a>
            <a href="/submit" className="btn btn-secondary">
              📝 Submit New Vulnerability
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
