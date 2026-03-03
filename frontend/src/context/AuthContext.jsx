import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // In a real production app, use an actual auth endpoint.
      // Here we leverage the existing auth.php if available, or simulate for now.
      const res = await fetch('http://127.0.0.1:8000/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        const userData = { username, role: data.role || 'Admin' };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid credentials' };
    } catch (e) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
