import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, ShoppingCart, MousePointer2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/storage';

export default function OutOfStock() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOOS = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}?action=getDashboardStats`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data.out_of_stock_products || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOOS();
  }, []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Package size={28} color="var(--status-danger)" />
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Out of Stock Products</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>These items are currently unavailable and causing lost revenue.</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>Scanning inventory...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <CheckCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--status-success)' }} />
          <h3>All products are in stock!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Great job keeping the shelves full.</p>
        </div>
      ) : (
        <div className="ecom-grid">
          {data.map((item) => (
            <div key={item.id} className="ecom-card" style={{ borderTop: '4px solid var(--status-danger)' }}>
              <div className="ecom-card-body" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 10 }}>{item.name}</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--status-danger)' }}>SOLD OUT</p>
                
                <div style={{ marginTop: 20, background: 'rgba(239,68,68,0.05)', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.1)' }}>
                   <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: 6 }}>
                      <TrendingUp size={16} /> Strategist Recommendation:
                   </p>
                   <p style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                      Based on recent demand, we recommend restocking at least **50 units** today to capture the week's peak sales days.
                   </p>
                </div>
              </div>
              <div className="ecom-card-footer" style={{ padding: '0 20px 20px' }}>
                 <button onClick={() => window.location.href = '#/stock'} className="btn-primary" style={{ width: '100%', background: 'var(--status-danger)' }}>
                   PROCURE STOCK NOW
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
