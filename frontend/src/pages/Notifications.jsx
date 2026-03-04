import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/storage';
import { Bell, AlertTriangle, Flame, PackageX, Clock, RefreshCw, CheckCircle, TrendingDown } from 'lucide-react';

function Kshs(n) {
  return `Kshs ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const Section = ({ icon, title, color, children, count }) => (
  <div className="card" style={{ borderLeft: `4px solid ${color}`, padding: 0, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: `${color}12`, borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ color }}>{icon}</span>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{title}</h3>
      <span style={{ marginLeft: 'auto', background: color, color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
        {count}
      </span>
    </div>
    <div style={{ padding: '8px 0' }}>{children}</div>
  </div>
);

const AlertRow = ({ label, sub, badge, badgeColor }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border-light)' }}>
    <div>
      <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
    </div>
    {badge && (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: `${badgeColor}20`, color: badgeColor, whiteSpace: 'nowrap' }}>
        {badge}
      </span>
    )}
  </div>
);

export default function Notifications() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const json = await apiFetch('getDashboardStats');
      if (json && json.status === 'success') setData(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const outProds     = data?.out_of_stock_products ?? [];
  const lowProds     = data?.low_stock_products    ?? [];
  const deadStock    = data?.dead_stock            ?? [];
  const expiryAlerts = data?.expiry_alerts         ?? [];

  const totalAlerts = outProds.length + lowProds.length + deadStock.length + expiryAlerts.length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={28} color="var(--primary-teal)" />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Notification Centre</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Real-time inventory and stock alerts</p>
          </div>
        </div>
        <button onClick={fetch_} className="theme-toggle-btn" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Scanning inventory for alerts…</p>
        </div>
      ) : totalAlerts === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 72 }}>
          <CheckCircle size={56} style={{ margin: '0 auto 16px', color: 'var(--status-success)' }} />
          <h3 style={{ marginBottom: 8 }}>All Clear!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Your store is running smoothly. No alerts at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Out of Stock',   count: outProds.length,  color: 'var(--status-danger)',  icon: <PackageX size={18}/> },
              { label: 'Low Stock',      count: lowProds.length,  color: 'var(--status-warning)', icon: <AlertTriangle size={18}/> },
              { label: 'Dead Stock',     count: deadStock.length, color: '#f97316',               icon: <Flame size={18}/> },
              { label: 'Expiry Alerts',  count: expiryAlerts.length, color: '#a78bfa',            icon: <Clock size={18}/> },
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 10px', borderTop: `3px solid ${s.color}` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, color: s.count > 0 ? s.color : 'var(--text-muted)' }}>{s.count}</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Out of Stock */}
          {outProds.length > 0 && (
            <Section icon={<PackageX size={18}/>} title="OUT OF STOCK — Immediate Action Required" color="var(--status-danger)" count={outProds.length}>
              {outProds.map((p, i) => (
                <AlertRow
                  key={i}
                  label={p.name}
                  sub={`Selling at ${Kshs(p.price)} — 0 units remaining`}
                  badge="Restock Now"
                  badgeColor="var(--status-danger)"
                />
              ))}
              <div style={{ padding: '12px 20px' }}>
                <button className="btn-primary" onClick={() => navigate('/stock')} style={{ fontSize: '0.82rem', padding: '8px 18px' }}>
                  → Go to Buy Products
                </button>
              </div>
            </Section>
          )}

          {/* Low Stock */}
          {lowProds.length > 0 && (
            <Section icon={<AlertTriangle size={18}/>} title="LOW STOCK — Reorder Soon" color="var(--status-warning)" count={lowProds.length}>
              {lowProds.map((p, i) => (
                <AlertRow
                  key={i}
                  label={p.name}
                  sub={`Selling at ${Kshs(p.price)}`}
                  badge={`${p.stock_quantity} remaining`}
                  badgeColor="var(--status-warning)"
                />
              ))}
            </Section>
          )}

          {/* Dead Stock */}
          {deadStock.length > 0 && (
            <Section icon={<Flame size={18}/>} title="DEAD STOCK — Capital Locked" color="#f97316" count={deadStock.length}>
              {deadStock.map((d, i) => (
                <AlertRow
                  key={i}
                  label={d.name}
                  sub={`${d.quantity} units · Capital locked: ${Kshs(d.capital_locked)}`}
                  badge={`${d.days_held} days held`}
                  badgeColor="#f97316"
                />
              ))}
            </Section>
          )}

          {/* Expiry Alerts */}
          {expiryAlerts.length > 0 && (
            <Section icon={<Clock size={18}/>} title="EXPIRY ALERTS — Check Batches" color="#a78bfa" count={expiryAlerts.length}>
              {expiryAlerts.map((e, i) => {
                const expired = e.days_left <= 0;
                const urgent  = e.days_left <= 3;
                const color   = expired ? 'var(--status-danger)' : urgent ? 'var(--status-warning)' : '#a78bfa';
                return (
                  <AlertRow
                    key={i}
                    label={e.name}
                    sub={`${e.quantity} units · Expires ${e.expiry_date}`}
                    badge={expired ? `${Math.abs(e.days_left)}d EXPIRED` : `${e.days_left}d left`}
                    badgeColor={color}
                  />
                );
              })}
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
