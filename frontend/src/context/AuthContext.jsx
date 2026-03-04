import { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_BASE_URL, setToken, clearToken, getToken } from '../lib/storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved && getToken()) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('auth_user'); }
    }
    setIsLoading(false);
  }, []);

  const persist = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const login = async (username, password) => {
    try {
      const res  = await fetch(`${AUTH_BASE_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        persist(data.user, data.token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid credentials.' };
    } catch {
      return { success: false, message: 'Cannot reach server. Is the API running?' };
    }
  };

  const signup = async (username, email, password, shopName) => {
    try {
      const res  = await fetch(`${AUTH_BASE_URL}?action=signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, shop_name: shopName }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        persist(data.user, data.token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Signup failed.' };
    } catch {
      return { success: false, message: 'Cannot reach server. Is the API running?' };
    }
  };

  const updateShopName = async (newName) => {
    try {
      const res  = await fetch(`${AUTH_BASE_URL}?action=updateShop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ shop_name: newName }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const updated = { ...user, shop_name: data.shop_name };
        setUser(updated);
        localStorage.setItem('auth_user', JSON.stringify(updated));
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Failed to update shop name.' };
    }
  };

  const logout = () => {
    setUser(null);
    clearToken();
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cart_items');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateShopName, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
