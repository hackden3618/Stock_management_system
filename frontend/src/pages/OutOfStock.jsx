import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/storage';

export default function OutOfStock() {
  const navigate = useNavigate();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchOOS = async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch('getDashboardStats');
      if (json && json.status === 'success') {
        setData(json.data.out_of_stock_products || []);
      } else {
        setError('Could not load data from server.');
      }
    } catch {
      setError('Cannot reach server. Make sure the PHP API is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOOS(); }, []);

  return (
    <div className="fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'grid', placeItems: 'center' }}>
            <Package size={22} color="var(--status-danger)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Out of Stock</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>Products with zero remaining inventory</p>
          </div>
        </div>
        <button onClick={fetchOOS} className="theme-toggle-btn" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: 'var(--status-danger)', fontSize: '0.88rem', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Scanning inventory…</p>
        </div>

      /* All clear */
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 70 }}>
          <CheckCircle size={52} style={{ margin: '0 auto 16px', color: 'var(--status-success)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>All products are in stock!</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Great job keeping the shelves full.</p>
        </div>

      /* Product list */
      ) : (
        <>
          {/* Summary strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '12px 18px', marginBottom: 22,
          }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--status-danger)' }}>{data.length}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              product{data.length !== 1 ? 's' : ''} out of stock — each one is a missed sale right now.
            </span>
            <button
              onClick={() => navigate('/stock')}
              className="btn-primary"
              style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Go to Buy Products <ArrowRight size={14} />
            </button>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.map((item) => (
              <div key={item.id} className="card" style={{
                borderLeft: '4px solid var(--status-danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 16, padding: '18px 20px',
              }}>
                {/* Left: product info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {item.image_path
                      ? <img src={item.image_path} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                      : <Package size={18} color="var(--status-danger)" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--status-danger)', fontWeight: 600, marginTop: 2 }}>
                      SOLD OUT · Kshs {parseFloat(item.price || 0).toFixed(2)} each
                    </p>
                  </div>
                </div>

                {/* Middle: recommendation */}
                <div style={{
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: 10, padding: '10px 14px', maxWidth: 340, flex: 1,
                }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--status-danger)', fontSize: '0.76rem', marginBottom: 5 }}>
                    <TrendingUp size={13} /> Recommendation
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Restock immediately to recover lost sales. Consider ordering based on your
                    fastest-selling week to avoid another stockout.
                  </p>
                </div>

                {/* Right: action */}
                <button
                  onClick={() => navigate('/stock')}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.83rem', background: 'var(--status-danger)', whiteSpace: 'nowrap' }}
                >
                  Restock Now
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
