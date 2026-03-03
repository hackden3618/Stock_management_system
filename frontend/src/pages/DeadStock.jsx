import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Clock, MousePointer2 } from 'lucide-react';

const API = 'http://127.0.0.1:8000/endpoints.php';

export default function DeadStock() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeadStock = async () => {
      try {
        const res = await fetch(`${API}?action=getDashboardStats`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data.dead_stock || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeadStock();
  }, []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <TrendingDown size={28} color="var(--status-warning)" />
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Slow-Moving & Dead Stock</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Items that haven't sold in 60+ days</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Analyzing stock movement...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--border-light)' }} />
          <h3>No Dead Stock detected!</h3>
          <p style={{ color: 'var(--text-muted)' }}>All your inventory is moving within healthy timeframes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((item, i) => {
            const breakEven = (parseFloat(item.buying_price) * 1.05).toFixed(2);
            return (
              <div key={i} className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{item.name}</h3>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Clock size={16} /> Held for {item.days_held} days
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Package size={16} /> {item.quantity} units remaining
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <AlertTriangle size={16} /> Capital Locked: Kshs. {item.capital_locked}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(251, 191, 36, 0.08)', padding: 16, borderRadius: 12, border: '1px solid rgba(251, 191, 36, 0.2)', maxWidth: 320 }}>
                     <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--status-warning)', fontSize: '0.85rem', marginBottom: 8 }}>
                        <TrendingDown size={16} /> Strategist Suggestion:
                     </p>
                     <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                        This item is causing cash flow issues. We recommend a <strong>15% Flash Discount</strong> or selling at a break-even price of <strong>Kshs {breakEven}</strong> to recover capital immediately.
                     </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
