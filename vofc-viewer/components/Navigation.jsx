'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../app/lib/supabaseClient';
// Removed localStorage dependencies - now using secure server-side authentication
import '../styles/cisa.css';
import PropTypes from 'prop-types';

export default function Navigation({ simple = false }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmissionsDropdown, setShowSubmissionsDropdown] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSubmissionsDropdown && !event.target.closest('[data-dropdown]')) {
        setShowSubmissionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSubmissionsDropdown]);

  const loadUser = async () => {
    try {
      // Use Supabase to get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // Get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
      }

      // Set current user with normalized role for consistent checks
      const normalizedRole = String(
        profile?.role || session.user.user_metadata?.role || 'user'
      ).toLowerCase();

      setCurrentUser({
        id: session.user.id,
        email: session.user.email,
        role: normalizedRole,
        name: profile?.full_name || session.user.user_metadata?.name || session.user.email,
        full_name: profile?.full_name || session.user.user_metadata?.name || session.user.email,
        ...profile
      });
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      } else {
        setCurrentUser(null);
        window.location.href = '/splash';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (simple) {
    // Render basic nav for public/unauth pages
    return (
      <nav className="bg-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-white">VOFC Viewer</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="View and search VOFC questions">VOFC Viewer (Questions)</Link>
                <Link href="/vulnerabilities" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="Search vulnerabilities">Vulnerability Viewer</Link>
                <Link href="/submit" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="Submit new vulnerabilities for review">Submit New Vulnerability</Link>
                <Link href="/submit-psa" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="Submit documents for processing">Submit Documents</Link>
                <Link href="/assessment" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="Generate vulnerability assessments">Generate Assessment</Link>
                <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="User management and database health">Admin</Link>
                <Link href="/learning" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-100 hover:bg-blue-800 hover:text-white" title="Monitor continuous learning system">Learning Monitor</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <header className="header" style={{
      background: 'linear-gradient(135deg, var(--cisa-blue) 0%, var(--cisa-blue-light) 100%)',
      color: 'var(--cisa-white)',
      padding: 'var(--spacing-lg) 0',
      boxShadow: 'var(--shadow-md)',
      borderBottom: '3px solid var(--cisa-blue-lighter)',
      marginBottom: 'var(--spacing-lg)',
      fontFamily: 'var(--font-family)'
    }}>
      <div className="header-content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 var(--spacing-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo Section */}
        <div className="logo" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)'
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <img
              src="/images/cisa-logo.png"
              alt="CISA Logo"
              style={{ height: '40px', width: 'auto', marginRight: 'var(--spacing-md)' }}
            />
            <div className="logo-text">
              <h1 style={{
                margin: '0',
                fontSize: 'var(--font-size-xl)',
                fontWeight: '700',
                color: 'var(--cisa-white)'
              }}>
                VOFC Engine
              </h1>
              <p style={{
                margin: '0',
                fontSize: 'var(--font-size-sm)',
                opacity: '0.9',
                color: 'var(--cisa-white)'
              }}>
                Vulnerabilities and Options for Consideration
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            📊 Dashboard
          </Link>
          {/* Submissions Dropdown */}
          <div style={{ position: 'relative' }} data-dropdown>
            <button
              onClick={() => setShowSubmissionsDropdown(!showSubmissionsDropdown)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius)',
                textDecoration: 'none',
                color: (pathname === '/submit' || pathname === '/submit/bulk' || pathname === '/process' || pathname === '/submit-psa' || pathname === '/review') ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
                backgroundColor: (pathname === '/submit' || pathname === '/submit/bulk' || pathname === '/process' || pathname === '/submit-psa' || pathname === '/review') ? 'rgba(255,255,255,0.2)' : 'transparent',
                fontWeight: '600',
                fontSize: 'var(--font-size-sm)',
                transition: 'all 0.3s ease',
                border: '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                fontFamily: 'var(--font-family)'
              }}
              onMouseEnter={(e) => {
                if (!(pathname === '/submit' || pathname === '/submit/bulk' || pathname === '/process' || pathname === '/submit-psa' || pathname === '/review')) {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.color = 'var(--cisa-white)';
                }
              }}
              onMouseLeave={(e) => {
                if (!(pathname === '/submit' || pathname === '/submit/bulk' || pathname === '/process' || pathname === '/submit-psa' || pathname === '/review')) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                }
              }}
            >
              📝 Submissions
              <span style={{ fontSize: 'var(--font-size-xs)' }}>
                {showSubmissionsDropdown ? '▲' : '▼'}
              </span>
            </button>
            
            {showSubmissionsDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                backgroundColor: 'var(--cisa-white)',
                border: '1px solid var(--cisa-gray-light)',
                borderRadius: 'var(--border-radius)',
                boxShadow: 'var(--shadow-elevated)',
                zIndex: 1000,
                minWidth: '200px',
                marginTop: 'var(--spacing-xs)'
              }}>
                <Link
                  href="/submit"
                  style={{
                    display: 'block',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: pathname === '/submit' ? 'var(--cisa-blue)' : 'var(--cisa-blue)',
                    textDecoration: 'none',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    borderBottom: '1px solid var(--cisa-gray-light)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--cisa-gray-lighter)';
                    e.target.style.color = 'var(--cisa-blue-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--cisa-blue)';
                  }}
                >
                  📝 Submit New Vulnerability
                </Link>
                <Link
                  href="/submit/bulk"
                  style={{
                    display: 'block',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: pathname === '/submit/bulk' ? 'var(--cisa-blue)' : 'var(--cisa-blue)',
                    textDecoration: 'none',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    borderBottom: '1px solid var(--cisa-gray-light)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--cisa-gray-lighter)';
                    e.target.style.color = 'var(--cisa-blue-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--cisa-blue)';
                  }}
                >
                  📁 Bulk Submit
                </Link>
                <Link
                  href="/submit-psa"
                  style={{
                    display: 'block',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: pathname === '/submit-psa' ? 'var(--cisa-blue)' : 'var(--cisa-blue)',
                    textDecoration: 'none',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    borderBottom: '1px solid var(--cisa-gray-light)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--cisa-gray-lighter)';
                    e.target.style.color = 'var(--cisa-blue-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--cisa-blue)';
                  }}
                >
                  📤 Submit Documents
                </Link>
                <Link
                  href="/process"
                  style={{
                    display: 'block',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: pathname === '/process' ? 'var(--cisa-blue)' : 'var(--cisa-blue)',
                    textDecoration: 'none',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    borderBottom: '1px solid var(--cisa-gray-light)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--cisa-gray-lighter)';
                    e.target.style.color = 'var(--cisa-blue-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--cisa-blue)';
                  }}
                >
                  🔄 Process Documents
                </Link>
                <Link
                  href="/review"
                  style={{
                    display: 'block',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: pathname === '/review' ? 'var(--cisa-blue)' : 'var(--cisa-blue)',
                    textDecoration: 'none',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--cisa-gray-lighter)';
                    e.target.style.color = 'var(--cisa-blue-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--cisa-blue)';
                  }}
                >
                  📋 Review Submissions
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/assessment"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              color: pathname === '/assessment' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
              backgroundColor: pathname === '/assessment' ? 'rgba(255,255,255,0.2)' : 'transparent',
              fontWeight: '600',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.3s ease',
              border: '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/assessment') {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--cisa-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/assessment') {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
          >
            📊 Generate Assessment
          </Link>
          {currentUser && (['admin','spsa','psa','analyst'].includes(String(currentUser.role).toLowerCase()) || currentUser.is_admin === true) && (
            <>
              <Link
                href="/admin"
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--border-radius)',
                  textDecoration: 'none',
                  color: pathname === '/admin' ? 'var(--cisa-white)' : 'rgba(255,255,255,0.8)',
                  backgroundColor: pathname === '/admin' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  fontWeight: '600',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'all 0.3s ease',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (pathname !== '/admin') {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    e.target.style.color = 'var(--cisa-white)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== '/admin') {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
              >
                ⚙️ Admin Panel
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          {!loading && currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  color: 'var(--cisa-white)'
                }}>
                  {currentUser.full_name}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'capitalize'
                }}>
                  {currentUser.role}
                </div>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <span style={{
                  color: 'var(--cisa-white)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600'
                }}>
                  {currentUser.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <Link
                href="/profile"
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'var(--cisa-white)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-family)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                👤 My Profile
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'var(--cisa-white)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-family)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

Navigation.propTypes = {
  simple: PropTypes.bool,
};
