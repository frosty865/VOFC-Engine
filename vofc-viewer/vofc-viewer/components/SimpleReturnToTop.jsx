'use client';
import { useState, useEffect } from 'react';

export default function SimpleReturnToTop() {
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
        width: '48px',
        height: '48px',
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
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = 'var(--cisa-blue)';
        e.target.style.transform = 'scale(1)';
      }}
      aria-label="Return to top"
      title="Return to top"
    >
      ↑
    </button>
  );
}

