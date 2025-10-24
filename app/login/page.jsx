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
        // For signup, we'll use username@vofc.gov as email
        const email = `${username}@vofc.gov`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
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
        
        const result = await response.json();
        
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
