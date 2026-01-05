import React, { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from './AuthContext';

// Protect routes based on auth state and optional role
const ProtectedRoute = ({ requiredRole, children, redirectTo }) => {
  const { isLoggedIn, userRole, initializing } = useContext(AuthContext);

  // External login portal default
  const loginUrl = redirectTo || 'http://localhost:4002/';

  useEffect(() => {
    if (initializing) return;
    const unauthorized = !isLoggedIn || (requiredRole && userRole !== requiredRole);
    if (unauthorized) {
      // Replace history so Back cannot return to protected page
      window.location.replace(loginUrl);
    }
    // Clean username param even when authorized (avoid exposing username in URL)
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('username')) {
        url.searchParams.delete('username');
        changed = true;
      }
      if (changed) {
        const newHref = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
        window.history.replaceState({}, '', newHref);
      }
    } catch {}
  }, [initializing, isLoggedIn, userRole, requiredRole, loginUrl]);

  // Handle BFCache restores (back/forward) by re-checking auth
  useEffect(() => {
    const onPageShow = (e) => {
      const unauthorized = !isLoggedIn || (requiredRole && userRole !== requiredRole);
      if (unauthorized) {
        window.location.replace(loginUrl);
        return;
      }
      // Clean username param on BFCache restore
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('username')) {
          url.searchParams.delete('username');
          const newHref = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
          window.history.replaceState({}, '', newHref);
        }
      } catch {}
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const unauthorized = !isLoggedIn || (requiredRole && userRole !== requiredRole);
        if (unauthorized) {
          window.location.replace(loginUrl);
          return;
        }
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('username')) {
            url.searchParams.delete('username');
            const newHref = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
            window.history.replaceState({}, '', newHref);
          }
        } catch {}
      }
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLoggedIn, userRole, requiredRole, loginUrl]);

  if (initializing) return null;
  const unauthorized = !isLoggedIn || (requiredRole && userRole !== requiredRole);
  if (unauthorized) {
    return null; // Render nothing while redirecting
  }

  // Support both wrapper usage and as a layout with Outlet
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
