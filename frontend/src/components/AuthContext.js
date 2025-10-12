import React, { createContext, useState, useEffect } from 'react';

// Create the AuthContext with default values
export const AuthContext = createContext({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

// Utility function to validate token expiration using expires_at or JWT exp
function isTokenValid(accessToken, expiresAt) {
  if (!accessToken) return false;

  // First, check expires_at if available
  if (expiresAt) {
    const now = new Date().toISOString();
    return expiresAt > now;
  }

  // Fallback to JWT decoding
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
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

  // Check localStorage for access_token and expires_at on mount to set login state
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('expires_at');
    if (accessToken && isTokenValid(accessToken, expiresAt)) {
      setIsLoggedIn(true);
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('expires_at');
      setIsLoggedIn(false);
    }
  }, []);

  // Login function to set login state and store access_token and expires_at
  const login = (data) => {
    const { access_token, expires_at } = data;
    localStorage.setItem('access_token', access_token);
    let expTime = expires_at;
    if (!expTime) {
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]));
        const exp = payload.exp;
        if (exp) {
          expTime = new Date(exp * 1000).toISOString();
        }
      } catch (error) {
        // If decoding fails, do nothing
      }
    }
    if (expTime) {
      localStorage.setItem('expires_at', expTime);
    }
    setIsLoggedIn(true);
  };

  // Logout function to clear login state and remove tokens
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('expires_at');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
