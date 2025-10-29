'use client';
import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile, canAccessAdmin } from '../lib/auth';

export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState({
    currentUser: null,
    userProfile: null,
    canAccessAdmin: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      setDebugInfo(prev => ({ ...prev, loading: true, error: null }));
      
      const [currentUser, userProfile, adminAccess] = await Promise.all([
        getCurrentUser(),
        getUserProfile(),
        canAccessAdmin()
      ]);

      setDebugInfo({
        currentUser,
        userProfile,
        canAccessAdmin: adminAccess,
        loading: false,
        error: null
      });
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const testAuthAPI = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = await response.json();
      console.log('Auth API Response:', result);
      alert(`Auth API Status: ${response.status}\nResponse: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Auth API Error:', error);
      alert(`Auth API Error: ${error.message}`);
    }
  };

  if (debugInfo.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Access Debug</h1>
        
        {/* Debug Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Current User</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo.currentUser, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">User Profile</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo.userProfile, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2">Admin Access</h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              debugInfo.canAccessAdmin 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {debugInfo.canAccessAdmin ? '✅ Can Access Admin' : '❌ Cannot Access Admin'}
            </div>
          </div>
          
          {debugInfo.error && (
            <div className="mt-4">
              <h3 className="font-semibold text-red-700 mb-2">Error</h3>
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {debugInfo.error}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={loadDebugInfo}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              🔄 Refresh Debug Info
            </button>
            <button
              onClick={testAuthAPI}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              🧪 Test Auth API
            </button>
            <a
              href="/admin"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded inline-block"
            >
              ⚙️ Go to Admin Panel
            </a>
          </div>
        </div>

        {/* Role Requirements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Role Requirements</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="font-medium">Admin Panel Access:</span>
              <span className="text-sm text-gray-600">admin, spsa, psa, analyst</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-medium">OFC Management:</span>
              <span className="text-sm text-gray-600">admin only</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="font-medium">Discipline Management:</span>
              <span className="text-sm text-gray-600">admin only</span>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">Current User Role:</h3>
            <p className="text-blue-800">
              {debugInfo.currentUser?.role || 'No role found'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
