import { BrowserRouter as Router, Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Bell, Search, Settings as SettingsIcon, Zap, TrendingUp, BarChart2, Menu, Sun, Moon, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSync } from './hooks/useSync';
import { API_BASE_URL } from './lib/storage';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Stock from './pages/Stock';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import OutOfStock from './pages/OutOfStock';
import DeadStock from './pages/DeadStock';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isSyncing, lastSyncTime, syncQueue, fetchLatestProducts } = useSync();
  const { user, logout, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [alertCount, setAlertCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // Fetch alert count for notification badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}?action=getDashboardStats`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          setAlertCount((d.out_of_stock_count || 0) + (d.low_stock_count || 0) + (d.dead_stock?.length || 0));
        }
      } catch { }
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  // Monitor Cart items
  useEffect(() => {
    const updateCart = () => {
      try {
        const items = JSON.parse(localStorage.getItem('cart_items')) || [];
        setCartCount(items.reduce((s, i) => s + i.quantity, 0));
      } catch(e) { setCartCount(0); }
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    return () => window.removeEventListener('storage', updateCart);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchLatestProducts();
    const handleOnline = () => syncQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchLatestProducts, syncQueue]);

  const displayStatus = isSyncing ? 'syncing' : (navigator.onLine ? 'online' : 'offline');

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      navigate(`/products?search=${encodeURIComponent(e.target.value)}`);
    }
  };

  if (isLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading session...</div>;
  if (!user) return <Login />;

  return (
    <>
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <Zap size={24} fill="currentColor" />
          GROWTH ENGINE
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end onClick={() => setIsMobileMenuOpen(false)}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <ShoppingCart size={20} />
            <span>Sell Products</span>
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div style={{ position: 'relative' }}>
              <Zap size={20} />
              {cartCount > 0 && <span className="cart-dot">{cartCount}</span>}
            </div>
            <span>Checkout / Cart</span>
          </NavLink>
          <NavLink to="/stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <Package size={20} />
            <span>Buy Products</span>
          </NavLink>
          <NavLink to="/dead-stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <TrendingUp size={20} />
            <span>Dead Stock</span>
          </NavLink>
          <NavLink to="/out-of-stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <BarChart2 size={20} />
            <span>Out of Stock</span>
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
            <SettingsIcon size={20} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />}

      <div className="main-wrapper">
        <header className="header">
          <div className="header-title">
            <button className="icon-button mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1>Stock Mgmt System <span className={`status-badge sync-${displayStatus}`}>{displayStatus}</span></h1>
            </Link>
          </div>
          <div className="header-search">
            <Search className="search-icon" size={18} />
            <input type="text" placeholder="Search products..." onKeyDown={handleSearch} />
          </div>
          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <Link to="/notifications" className="icon-button" style={{ textDecoration: 'none' }}>
              <Bell size={20} />
              {alertCount > 0 && <span className="badge">{alertCount > 9 ? '9+' : alertCount}</span>}
            </Link>
            <Link to="/settings" style={{ textDecoration: 'none' }}>
              <div className="user-avatar">{user?.username?.substring(0, 2).toUpperCase() || 'AD'}</div>
            </Link>
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/dead-stock" element={<DeadStock />} />
            <Route path="/out-of-stock" element={<OutOfStock />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
