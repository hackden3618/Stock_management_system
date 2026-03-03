import { BrowserRouter as Router, Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Bell, Search,
  Settings as SettingsIcon, Zap, Menu, Sun, Moon,
  ShoppingBag, PackageX, Flame, Wifi, WifiOff
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSync } from './hooks/useSync';
import { API_BASE_URL, getCart } from './lib/storage';

import Dashboard     from './pages/Dashboard';
import Products      from './pages/Products';
import Cart          from './pages/Cart';
import Stock         from './pages/Stock';
import Login         from './pages/Login';
import Settings      from './pages/Settings';
import Notifications from './pages/Notifications';
import OutOfStock    from './pages/OutOfStock';
import DeadStock     from './pages/DeadStock';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isOnline }        = useSync();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme]   = useState(() => localStorage.getItem('theme') || 'dark');
  const [alertCount, setAlertCount] = useState(0);
  const [cartCount, setCartCount]   = useState(0);
  const navigate = useNavigate();

  // Alert badge
  useEffect(() => {
    const refresh = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}?action=getDashboardStats`);
        const json = await res.json();
        if (json.status === 'success') {
          const d = json.data;
          setAlertCount(
            (d.out_of_stock_count    || 0) +
            (d.low_stock_count       || 0) +
            (d.dead_stock?.length    || 0) +
            (d.expiry_alerts?.length || 0)
          );
        }
      } catch {}
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  // Cart badge (cart lives in localStorage)
  useEffect(() => {
    const update = () => {
      const items = getCart();
      setCartCount(items.reduce((s, i) => s + i.quantity, 0));
    };
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/products?search=${encodeURIComponent(e.target.value.trim())}`);
    }
  };

  if (isLoading) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );
  if (!user) return <Login />;

  const navLink = (to, Icon, label, badge, end = false) => (
    <NavLink
      to={to} end={end}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={() => setMobileOpen(false)}
    >
      <div style={{ position: 'relative' }}>
        <Icon size={19} />
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -8,
            background: 'var(--status-danger)', color: '#fff',
            borderRadius: '50%', fontSize: '0.58rem', fontWeight: 700,
            width: 14, height: 14, display: 'grid', placeItems: 'center'
          }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </div>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <Zap size={20} fill="currentColor" />
          GROWTH ENGINE
        </div>
        <nav className="sidebar-nav">
          {navLink('/',             LayoutDashboard, 'Dashboard',      0,          true)}
          {navLink('/products',     ShoppingCart,    'Sell Products',  0)}
          {navLink('/cart',         ShoppingBag,     'Checkout / Cart',cartCount)}
          {navLink('/stock',        Package,         'Buy Products',   0)}
          {navLink('/dead-stock',   Flame,           'Dead Stock',     0)}
          {navLink('/out-of-stock', PackageX,        'Out of Stock',   0)}
        </nav>
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
          {navLink('/settings', SettingsIcon, 'Settings', 0)}
        </div>
      </aside>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <div className="main-wrapper">
        <header className="header">
          <div className="header-title">
            <button className="icon-button mobile-menu-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 700 }}>Stock Mgmt System</h1>
            </Link>
          </div>

          <div className="header-search">
            <Search className="search-icon" size={16} />
            <input type="text" placeholder="Search products…" onKeyDown={handleSearch} />
          </div>

          <div className="header-actions">
            {/* Online indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
              background: isOnline ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              color: isOnline ? 'var(--status-success)' : 'var(--status-danger)'
            }}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            <Link to="/notifications" className="icon-button" style={{ textDecoration: 'none', position: 'relative' }}>
              <Bell size={19} />
              {alertCount > 0 && <span className="badge">{alertCount > 9 ? '9+' : alertCount}</span>}
            </Link>

            <Link to="/settings" style={{ textDecoration: 'none' }}>
              <div className="user-avatar">{user?.username?.substring(0, 2).toUpperCase() || 'AD'}</div>
            </Link>
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/products"      element={<Products />} />
            <Route path="/cart"          element={<Cart />} />
            <Route path="/stock"         element={<Stock />} />
            <Route path="/settings"      element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/dead-stock"    element={<DeadStock />} />
            <Route path="/out-of-stock"  element={<OutOfStock />} />
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
