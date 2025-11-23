import React, { useEffect, useContext, useRef } from 'react';
import Swal from 'sweetalert2';
import { AuthContext } from './AuthContext';

const SessionManager = () => {
  const { isLoggedIn, logout } = useContext(AuthContext);
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeouts
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }

    if (isLoggedIn) {
      const expiresAt = localStorage.getItem('expires_at');
      if (expiresAt) {
        const now = new Date();
        const expireTime = new Date(expiresAt);
        const timeToExpire = expireTime - now;

        if (timeToExpire > 0) {
          // Set warning 2 minutes before expiration
          const warningTime = timeToExpire - 2 * 60 * 1000;
          if (warningTime > 0) {
            warningTimeoutRef.current = setTimeout(() => {
              Swal.fire({
                title: 'Session Expiring Soon',
                text: 'Your session will expire soon. Please finish your order or sign in again to continue..',
                icon: 'warning',
                confirmButtonText: 'OK'
              });
            }, warningTime);
          }

          // Set auto-logout at expiration
          logoutTimeoutRef.current = setTimeout(() => {
            logout();
            window.location.replace('http://localhost:4002/');
          }, timeToExpire);
        } else {
          // Already expired, logout immediately
          logout();
          window.location.replace('http://localhost:4002/');
        }
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, [isLoggedIn, logout]);

  return null; // This component doesn't render anything
};

export default SessionManager;
