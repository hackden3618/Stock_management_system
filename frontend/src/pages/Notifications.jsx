import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/storage';
import { Bell, AlertTriangle, Flame, Package } from 'lucide-react';

export default function Notifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}?action=getDashboardStats`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          const list = [];
          
          if (d.out_of_stock_count > 0) {
            list.push({ type: 'danger', icon: <Package size={20}/>, title: 'Out of Stock Critical', message: `${d.out_of_stock_count} products are sold out.` });
          }
          if (d.low_stock_count > 0) {
            list.push({ type: 'warning', icon: <AlertTriangle size={20}/>, title: 'Low Stock Warning', message: `${d.low_stock_count} products need reordering.` });
          }
          if (d.dead_stock?.length > 0) {
            list.push({ type: 'info', icon: <Flame size={20}/>, title: 'Dead Stock Detected', message: `${d.dead_stock.length} batches are stagnant for 60+ days.` });
          }
          
          setAlerts(list);
        }
      } catch { }
      setLoading(false);
    };
    fetchAlerts();
  }, []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Bell size={28} color="var(--primary-teal)" />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Notification Center</h2>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Fetching system alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Bell size={48} style={{ margin: '0 auto 16px', color: 'var(--border-light)', opacity: 0.3 }} />
          <h3>No notifications</h3>
          <p style={{ color: 'var(--text-muted)' }}>Your store is running like a well-oiled machine.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {alerts.map((a, i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', borderLeft: `4px solid var(--status-${a.type})` }}>
              <div style={{ color: `var(--status-${a.type})` }}>{a.icon}</div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{a.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
