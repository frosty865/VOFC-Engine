'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TestLogin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Test getting user profile
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('username', 'admin')
          .single();
        
        if (error) {
          setTestResult(`Profile error: ${error.message}`);
        } else {
          setTestResult(`Profile found: ${JSON.stringify(profile, null, 2)}`);
        }
      }
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@vofc.gov',
        password: 'Admin123!'
      });
      
      if (error) {
        setTestResult(`Login error: ${error.message}`);
      } else {
        setTestResult(`Login successful! User: ${data.user?.email}`);
        setUser(data.user);
      }
    } catch (error) {
      setTestResult(`Login error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTestResult('');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Login Test Page</h1>
      
      {user ? (
        <div>
          <p className="mb-4">✅ Logged in as: {user.email}</p>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary mr-4"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">❌ Not logged in</p>
          <button 
            onClick={handleLogin}
            className="btn btn-primary"
            disabled={loading}
          >
            Test Login
          </button>
        </div>
      )}
      
      {testResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Test Result:</h3>
          <pre className="text-sm">{testResult}</pre>
        </div>
      )}
    </div>
  );
}


