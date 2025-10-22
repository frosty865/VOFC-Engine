import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from './auth';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 1 * 60 * 1000; // 1 minute warning before timeout

export function useSessionTimeout() {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT);

  const resetTimeout = () => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    setShowWarning(false);
    setTimeLeft(SESSION_TIMEOUT);

    // Set warning timeout (4 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft(WARNING_TIME);
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout (5 minutes)
    timeoutRef.current = setTimeout(async () => {
      await handleLogout();
    }, SESSION_TIMEOUT);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/splash');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/splash');
    }
  };

  const handleActivity = () => {
    resetTimeout();
  };

  const handleBeforeUnload = () => {
    // Logout on page close/refresh
    logout();
  };

  useEffect(() => {
    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up page close listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initialize timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  // Update countdown
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  return {
    showWarning,
    timeLeft: Math.ceil(timeLeft / 1000),
    resetTimeout
  };
}
