import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for existing user in localStorage
    const storedUser = localStorage.getItem('gameUser');
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('gameUser');
      }
    }
    
    setLoading(false);
  }, []);
  
  // Login function - simple username-based authentication
  const login = (username, userId = null) => {
    if (!username || username.trim() === '') {
      throw new Error('Username is required');
    }
    
    const newUser = {
      username: username.trim(),
      userId: userId, // This will be set by the socket connection
      loginTime: new Date().toISOString()
    };
    
    // Store user in localStorage
    localStorage.setItem('gameUser', JSON.stringify(newUser));
    setUser(newUser);
    
    return newUser;
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('gameUser');
    localStorage.removeItem('sessionId'); // Also clear socket session
    setUser(null);
  };
  
  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
