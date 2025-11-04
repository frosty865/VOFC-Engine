'use client';
import { useState, useEffect } from 'react';

export default function ReturnToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        backgroundColor: 'var(--cisa-blue)',
        color: 'var(--cisa-white)',
        border: 'none',
        borderRadius: '50%',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-elevated)',
        transition: 'all 0.3s ease',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: '600'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = 'var(--cisa-blue-dark)';
        e.target.style.transform = 'scale(1.1)';
        e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = 'var(--cisa-blue)';
        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = 'var(--shadow-elevated)';
      }}
      onFocus={(e) => {
        e.target.style.outline = '2px solid var(--cisa-blue-lighter)';
        e.target.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.target.style.outline = 'none';
      }}
      aria-label="Return to top"
      title="Return to top"
    >
      <svg 
        style={{ width: '24px', height: '24px' }}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </button>
  );
}
