'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import '../../styles/cisa.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // For signup, we'll use the same custom JWT authentication
        const email = `${username}@vofc.gov`;
        
        console.log('Attempting signup with:', { email, password });
        
        // Use custom JWT authentication for signup too
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, action: 'signup' }),
        });
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ HTTP error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        // Check if response has content before parsing JSON
        const responseText = await response.text();
        console.log('📝 Raw response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('❌ JSON parsing error:', jsonError);
          console.error('❌ Response text:', responseText);
          
          // Check if response is HTML (error page)
          if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Server returned HTML error page instead of JSON. This might be a deployment issue.');
          }
          
          throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }
        
        console.log('Signup response:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Signup failed');
        }
        
        console.log('Signup successful:', result);
        alert('Account created successfully! You are now logged in.');
        
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Redirecting to home page...');
        router.push('/');
      } else {
        // For login, construct email from username
        const email = `${username}@vofc.gov`;
        
        console.log('Attempting login with:', { email, password });
        
        // Use custom JWT authentication
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ HTTP error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        // Check if response has content before parsing JSON
        const responseText = await response.text();
        console.log('📝 Raw response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('❌ JSON parsing error:', jsonError);
          console.error('❌ Response text:', responseText);
          
          // Check if response is HTML (error page)
          if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Server returned HTML error page instead of JSON. This might be a deployment issue.');
          }
          
          throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }
        
        console.log('Login response:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Login failed');
        }
        
        console.log('Login successful:', result);
        
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Redirecting to home page...');
        router.push('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--cisa-gray-lighter)'}}>
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title text-center">VOFC Viewer</h1>
            <p className="text-center text-secondary">Sign in to access the system</p>
          </div>
          
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </form>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="btn btn-link"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
