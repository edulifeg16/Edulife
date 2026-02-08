import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    // Check local storage for user data on initial load
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        // Normalize user object: ensure both `id` and `_id` are present
        if (parsed) {
          if (!parsed._id && parsed.id) parsed._id = parsed.id;
          if (!parsed.id && parsed._id) parsed.id = parsed._id;
        }
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
      }
      setToken(storedToken);
    }
    setLoading(false); // Finished loading
  }, []);

  const login = (userData, userToken) => {
    // Normalize user object to include `_id` for consistency across the app
  const normalized = { ...userData };
  // Ensure both id forms exist for compatibility across the app
  if (!normalized._id && normalized.id) normalized._id = normalized.id;
  if (!normalized.id && normalized._id) normalized.id = normalized._id;
    localStorage.setItem('user', JSON.stringify(normalized));
    localStorage.setItem('token', userToken);
    setUser(normalized);
    setToken(userToken);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  // Do not render children until we have checked for existing session
  if (loading) {
    return <div>Loading Application...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};