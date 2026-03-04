import { BrowserRouter as Router, Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Bell, Settings as SettingsIcon,
  Zap, Menu, Sun, Moon, ShoppingBag, PackageX, Flame,
  Wifi, WifiOff, Search, Clock, ShieldAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSync } from './hooks/useSync';
import { API_BASE_URL, getCart, getToken } from './lib/storage';
import { useAuth, AuthProvider } from './context/AuthContext';

import Dashboard    from './pages/Dashboard';
import Products     from './pages/Products';
import Cart         from './pages/Cart';
import Stock        from './pages/Stock';
import Login        from './pages/Login';
import Settings     from './pages/Settings';
import Notifications from './pages/Notifications';
import OutOfStock   from './pages/OutOfStock';
import DeadStock    from './pages/DeadStock';
import ExpiredStock from './pages/ExpiredStock';
import ExpiringSoon from './pages/ExpiringSoon';

function AppContent() {
  const { isOnline }        = useSync();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme]   = useState(() => localStorage.getItem('theme') || 'dark');
  const [alerts, setAlerts] = useState({ total: 0, expired: 0, expiring: 0 });
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}?action=getDashboardStats`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const json = await res.json();
        if (json.status === 'success') {
          const d = json.data;
          setAlerts({
            total:    (d.out_of_stock_count||0) + (d.low_stock_count||0) + (d.dead_stock?.length||0) + (d.expiry_alerts?.length||0),
            expired:  d.expired_count || 0,
            expiring: d.expiry_alerts?.length || 0,
          });
        }
      } catch {}
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const update = () => setCartCount(getCart().reduce((s, i) => s + i.quantity, 0));
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/products?search=${encodeURIComponent(e.target.value.trim())}`);
      e.target.value = '';
    }
  };

  if (isLoading) return (
    <div style={{ display:'grid', placeItems:'center', height:'100vh', color:'var(--text-muted)' }}>Loading…</div>
  );
  if (!user) return <Login />;

  const shopName = user.shop_name || 'My Shop';

  const NavItem = ({ to, icon: Icon, label, badge, end }) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <Icon size={18} />
        {badge > 0 && (
          <span style={{ position:'absolute', top:-5, right:-7, background:'var(--status-danger)', color:'#fff', borderRadius:'50%', fontSize:'0.55rem', fontWeight:800, width:13, height:13, display:'grid', placeItems:'center' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo"><Zap size={18} fill="currentColor" /> GROWTH ENGINE</div>
        <nav className="sidebar-nav">
          <NavItem to="/"             icon={LayoutDashboard} label="Dashboard"        end />
          <NavItem to="/products"     icon={ShoppingCart}    label="Sell Products" />
          <NavItem to="/cart"         icon={ShoppingBag}     label="Checkout / Cart"  badge={cartCount} />
          <NavItem to="/stock"        icon={Package}         label="Inventory" />

          {/* Expiry section divider */}
          <div style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.08em', padding:'12px 14px 4px', opacity:0.6 }}>
            STOCK HEALTH
          </div>
          <NavItem to="/expiring-soon"  icon={Clock}       label="Expiring Soon"  badge={alerts.expiring} />
          <NavItem to="/expired-stock"  icon={ShieldAlert} label="Expired Stock"  badge={alerts.expired} />
          <NavItem to="/out-of-stock"   icon={PackageX}    label="Out of Stock" />
          <NavItem to="/dead-stock"     icon={Flame}       label="Dead Stock" />
        </nav>
        <div style={{ marginTop:'auto', borderTop:'1px solid var(--border-light)', paddingTop:14 }}>
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" />
        </div>
      </aside>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <div className="main-wrapper">
        <header className="header">
          <div className="header-title">
            <button className="icon-button mobile-menu-btn" onClick={() => setMobileOpen(true)} style={{ display:'none' }}>
              <Menu size={20} />
            </button>
            <Link to="/" style={{ textDecoration:'none', minWidth:0 }}>
              <h1 style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--primary-teal)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'22vw' }}>
                {shopName}
              </h1>
            </Link>
          </div>

          <div className="header-search">
            <Search className="search-icon" size={15} />
            <input type="text" placeholder="Search products…" onKeyDown={handleSearch} />
          </div>

          <div className="header-actions">
            <div className="hide-mobile" style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:20,
              fontSize:'0.72rem', fontWeight:600,
              background: isOnline ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              color: isOnline ? 'var(--status-success)' : 'var(--status-danger)',
            }}>
              {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <button className="theme-toggle-btn hide-mobile" onClick={() => setTheme(t => t==='dark'?'light':'dark')}>
              {theme==='dark' ? <Sun size={14}/> : <Moon size={14}/>}
              {theme==='dark' ? 'Light' : 'Dark'}
            </button>
            <Link to="/notifications" className="icon-button" style={{ textDecoration:'none', position:'relative', display:'grid', placeItems:'center' }}>
              <Bell size={18} />
              {alerts.total > 0 && <span className="badge">{alerts.total > 9 ? '9+' : alerts.total}</span>}
            </Link>
            <Link to="/settings" style={{ textDecoration:'none' }}>
              <div className="user-avatar" title={`${user.username} — ${shopName}`}>
                {user.username?.substring(0,2).toUpperCase() || 'ME'}
              </div>
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
            <Route path="/expired-stock" element={<ExpiredStock />} />
            <Route path="/expiring-soon" element={<ExpiringSoon />} />
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
