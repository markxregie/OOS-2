import React, { createContext, useState, useEffect } from 'react';

// Create the AuthContext with default values
export const AuthContext = createContext({
  isLoggedIn: false,
  username: null,
  userRole: null,
  login: () => {},
  logout: () => {},
});

// Utility function to validate token expiration using expires_at or JWT exp
function isTokenValid(authToken, expiresAt) {
  if (!authToken) return false;

  // First, check expires_at if available
  if (expiresAt) {
    const now = new Date().toISOString();
    return expiresAt > now;
  }

  // Fallback to JWT decoding
  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return exp > now;
  } catch (error) {
    return false;
  }
}

// AuthProvider component to wrap the app and provide auth state
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Check localStorage for authToken and expires_at on mount to set login state
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const expiresAt = localStorage.getItem('expires_at');
    const userData = localStorage.getItem('userData');
    if (authToken && isTokenValid(authToken, expiresAt)) {
      setIsLoggedIn(true);
      if (userData) {
        try {
          const { username, userRole } = JSON.parse(userData);
          setUsername(username);
          setUserRole(userRole);
        } catch (error) {
          // Ignore parse error
        }
      }
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('userData');
      setIsLoggedIn(false);
      setUsername(null);
      setUserRole(null);
    }
  }, []);

  // Login function to set login state and store authToken and expires_at
  const login = (data) => {
    const { authToken, expires_at } = data;

    // Save token
    localStorage.setItem('authToken', authToken);

    // ✅ Decode username and role from JWT and store in userData
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const username = payload.sub;
      const userRole = payload.role;
      if (username) {
        localStorage.setItem('userData', JSON.stringify({ username, userRole }));
        setUsername(username);
        setUserRole(userRole);
      }
    } catch (error) {
      console.error("Failed to decode username from token:", error);
    }

    // Handle expiration
    let expTime = expires_at;
    if (!expTime) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const exp = payload.exp;
        if (exp) {
          expTime = new Date(exp * 1000).toISOString();
        }
      } catch (error) {
        // Ignore decode error
      }
    }
    if (expTime) {
      localStorage.setItem('expires_at', expTime);
    }

    setIsLoggedIn(true);
  };

  // Logout function to clear login state and remove tokens
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    setUsername(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
