import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSync } from '../hooks/useSync';
import { API_BASE_URL } from '../lib/storage';
import { TrendingUp, AlertCircle, ArrowUpRight, RefreshCw, Star, Calendar, PackageX, Flame, BarChart2, Zap, Wifi, WifiOff } from 'lucide-react';

function Kshs(n) {
  return `Kshs. ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSyncing, queueLength, isOnline } = useSync();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}?action=getDashboardStats`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setStats(json.data);
          setLastFetch(new Date());
        }
      }
    } catch (e) {
      console.log('Could not fetch dashboard stats — offline mode.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (queueLength === 0 && !isSyncing) {
      fetchStats();
    }
  }, [queueLength, isSyncing, fetchStats]);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, color: 'var(--text-muted)' }}>
        <RefreshCw size={36} className="spin" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const inventoryVal = stats?.inventory_value ?? 0;
  const burnRate     = stats?.burn_rate_per_day ?? 0;
  const salesAll     = stats?.sales_all_time ?? 0;
  const profitAll    = stats?.profit_all_time ?? 0;
  const topProds     = stats?.top_products ?? [];
  const topDays      = stats?.top_days ?? [];
  const deadStock    = stats?.dead_stock ?? [];
  const outOfStock   = stats?.out_of_stock_products ?? [];
  const lowCount     = stats?.low_stock_count ?? 0;
  const outCount     = stats?.out_of_stock_count ?? 0;
  const turnover     = stats?.turnover_ratio ?? 0;
  const recentSales  = stats?.recent_sales ?? [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📊 Growth Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time business intelligence {lastFetch && <span> · Updated {lastFetch.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isOnline ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: isOnline ? 'var(--status-success)' : 'var(--status-danger)' }}>
            {isOnline ? <Wifi size={14}/> : <WifiOff size={14}/>} {isOnline ? 'Online' : 'Offline'}
          </div>
          {queueLength > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.1)', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
              <Zap size={14} className={isSyncing ? "spin" : ""}/> {isSyncing ? 'Syncing...' : `${queueLength} Pending Sync`}
            </div>
          )}
          <button onClick={fetchStats} className="theme-toggle-btn" style={{ padding: '8px 12px' }}><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="responsive-grid-3">
        <div className="card" onClick={() => navigate('/stock')} style={{ cursor: 'pointer' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>📦 Inventory Valuation</p>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{Kshs(inventoryVal)}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Total value of goods in store.</p>
        </div>
        <div className="card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>🔥 Sales Velocity</p>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{Kshs(burnRate)}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/day</span></h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>All-time: <strong>{Kshs(salesAll)}</strong></p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>💰 Net Profit (FEFO)</p>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-success)' }}>{Kshs(profitAll)}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Realized profit on sales.</p>
        </div>
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
             <h3 style={{ fontSize: '1.1rem', marginBottom: 20 }}>🏆 Performance Leaders</h3>
             <div className="responsive-grid-2">
                <div>
                   <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Top Products</h4>
                   {topProds.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                         <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                         <span style={{ fontWeight: 700, color: 'var(--primary-teal)' }}>{p.units_sold} sold</span>
                      </div>
                   ))}
                </div>
                <div>
                   <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Peak Revenue Days</h4>
                   {topDays.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                         <span style={{ fontSize: '0.9rem' }}>{d.day_name}</span>
                         <span style={{ fontWeight: 700 }}>{Kshs(d.revenue)}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
          <div className="responsive-grid-2">
             <div className="card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>📈 Turnover Ratio</h3>
                <div style={{ position: 'relative', width: 140, height: 70, margin: '20px auto', overflow: 'hidden' }}>
                    <div style={{ width: 140, height: 140, borderRadius: '50%', background: `conic-gradient(from 270deg, var(--status-success) 0deg, var(--status-success) ${(turnover/10)*180}deg, var(--bg-app) ${(turnover/10)*180}deg)`, padding: 15 }}>
                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)', borderRadius: '50%' }} />
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{turnover}x</h2>
                    </div>
                </div>
             </div>
             <div className="card">
                <h3 style={{ fontSize: '1rem', marginBottom: 15 }}>🧾 Recent Sales</h3>
                {recentSales.map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>#{s.id.substring(0,6)}</span>
                        <span style={{ fontWeight: 600 }}>{Kshs(s.total_amount)}</span>
                    </div>
                ))}
             </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
           <h3 style={{ fontSize: '1.1rem' }}>💡 Strategist Alerts</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {outOfStock.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid var(--status-danger)' }}>
                      <div style={{ display: 'flex', gap: 8, color: 'var(--status-danger)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}><PackageX size={16}/> OUT OF STOCK</div>
                      <p style={{ fontSize: '0.75rem' }}>Restock <strong>{outOfStock[0]?.name}</strong> immediately.</p>
                  </div>
              )}
              {deadStock.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid var(--status-warning)' }}>
                      <div style={{ display: 'flex', gap: 8, color: 'var(--status-warning)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}><Flame size={16}/> DEAD STOCK</div>
                      <p style={{ fontSize: '0.75rem' }}><strong>{deadStock[0]?.name}</strong> held for {deadStock[0]?.days_held} days.</p>
                  </div>
              )}
              {lowCount > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(79,70,229,0.05)', border: '1px solid var(--accent-blue)' }}>
                      <div style={{ display: 'flex', gap: 8, color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}><AlertCircle size={16}/> LOW STOCK ({lowCount})</div>
                  </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
