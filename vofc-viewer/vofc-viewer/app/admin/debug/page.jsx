'use client';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../lib/auth';
import { fetchWithAuth } from '../../lib/fetchWithAuth';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const user = await getCurrentUser();
        
        // Test API endpoints
        const ofcsResponse = await fetchWithAuth('/api/admin/ofcs', {
          method: 'GET'
        });
        
        const ofcsData = await ofcsResponse.json();
        
        setDebugInfo({
          user: user,
          ofcsApiStatus: ofcsResponse.status,
          ofcsApiResponse: ofcsData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        setDebugInfo({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };
    
    runDiagnostics();
  }, []);

  if (loading) {
    return <div>Loading diagnostics...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
