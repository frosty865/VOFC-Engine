'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DebugLogin() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...\n');
    
    try {
      console.log('Starting login test...');
      
      const email = 'admin@vofc.gov';
      const password = 'Admin123!';
      
      console.log('Attempting login with:', { email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Login response:', { data, error });
      
      if (error) {
        setResult(`❌ Login failed: ${error.message}\nError code: ${error.status}\nFull error: ${JSON.stringify(error, null, 2)}`);
        return;
      }
      
      setResult(`✅ Login successful!\nUser: ${data.user?.email}\nSession: ${data.session ? 'Active' : 'None'}\nUser ID: ${data.user?.id}`);
      
      // Test profile fetch
      console.log('Testing profile fetch...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', 'admin')
        .single();
      
      if (profileError) {
        setResult(prev => prev + `\n❌ Profile fetch failed: ${profileError.message}`);
      } else {
        setResult(prev => prev + `\n✅ Profile found: ${JSON.stringify(profile, null, 2)}`);
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setResult(`❌ Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Login</h1>
      
      <button 
        onClick={testLogin}
        disabled={loading}
        className="btn btn-primary mb-4"
      >
        {loading ? 'Testing...' : 'Test Login'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}


