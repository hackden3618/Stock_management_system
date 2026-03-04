import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowLeft, CheckCircle, Package, AlertCircle, Minus, Plus } from 'lucide-react';
import { apiFetch, getCart, saveCart } from '../lib/storage';

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [busy, setBusy]       = useState(false);
  const [success, setSuccess] = useState(null); // { saleId, total }
  const [error, setError]     = useState('');

  useEffect(() => { setItems(getCart()); }, []);

  const commit = (updated) => {
    setItems(updated);
    saveCart(updated);
  };

  const remove = (id)   => commit(items.filter(i => i.id !== id));

  const changeQty = (id, delta) => {
    commit(items.map(i => {
      if (i.id !== id) return i;
      const next = i.quantity + delta;
      if (next < 1) return i;
      if (next > i.stock_quantity) {
        setError(`Only ${i.stock_quantity} units of "${i.name}" available.`);
        setTimeout(() => setError(''), 3000);
        return i;
      }
      return { ...i, quantity: next };
    }));
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (!items.length) return;
    setBusy(true);
    setError('');

    const saleId = crypto.randomUUID();
    const payload = {
      type: 'NEW_SALE',
      id:   saleId,
      timestamp: new Date().toISOString(),
      payload: {
        total_amount: total,
        items: items.map(i => ({
          product_id: i.id,
          quantity:   i.quantity,
          price:      i.price,
        })),
      },
    };

    try {
      const json = await apiFetch('sync', payload);

      if (json && json.status === 'success') {
        commit([]);                      // clear cart
        setSuccess({ saleId, total });   // show receipt
      } else {
        setError(json?.message || 'Sale failed. Please try again.');
      }
    } catch {
      setError('Cannot reach server. Check that the PHP API is running on port 8000.');
    }
    setBusy(false);
  };

  // ── Success / Receipt screen ────────────────────────────────────────
  if (success) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', display: 'grid', placeItems: 'center' }}>
          <CheckCircle size={48} color="var(--status-success)" />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Sale Recorded!</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Transaction <code style={{ background: 'var(--bg-app)', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem' }}>#{success.saleId.slice(0, 8)}</code> saved to database.
        </p>
        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-teal)' }}>
          Kshs {Number(success.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button className="btn-primary" onClick={() => { setSuccess(null); navigate('/products'); }}>
            New Sale
          </button>
          <button className="theme-toggle-btn" onClick={() => { setSuccess(null); navigate('/'); }}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: 12 }}>
        <ShoppingCart size={60} style={{ opacity: 0.1 }} />
        <h3 style={{ fontSize: '1.3rem' }}>Cart is empty</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Add products from Sell Products first.</p>
        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/products')}>
          Browse Products
        </button>
      </div>
    );
  }

  // ── Main cart ───────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate('/products')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Checkout Cart</h2>
        <span style={{ background: 'var(--primary-teal)', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--status-danger)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--status-danger)' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      <div style={{ className: 'cart-layout', style: { alignItems: 'start' }}}>
        {/* Item list */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0',
              borderBottom: idx < items.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              {/* Thumbnail */}
              <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg-app)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {item.image_path
                  ? <img src={item.image_path} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Package size={20} color="var(--text-muted)" />}
              </div>

              {/* Name + unit price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                  Kshs {parseFloat(item.price).toFixed(2)} each · {item.stock_quantity} in stock
                </p>
              </div>

              {/* Qty stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => changeQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Minus size={12} />
                </button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{item.quantity}</span>
                <button onClick={() => changeQty(item.id, +1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Plus size={12} />
                </button>
              </div>

              {/* Line total */}
              <p style={{ fontWeight: 800, fontSize: '1rem', minWidth: 80, textAlign: 'right' }}>
                Kshs {(item.price * item.quantity).toFixed(2)}
              </p>

              {/* Remove */}
              <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', padding: 6, display: 'grid', placeItems: 'center' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Order Summary</h3>

            {items.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>{i.name} ×{i.quantity}</span>
                <span>Kshs {(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary-teal)' }}>
              <span>Total</span>
              <span>Kshs {total.toFixed(2)}</span>
            </div>

            <button
              className="btn-primary"
              style={{ padding: '14px', fontSize: '1rem', marginTop: 4 }}
              disabled={busy}
              onClick={handleCheckout}
            >
              {busy ? '⏳ Recording sale…' : '✅ Complete Sale'}
            </button>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Sale is saved directly to the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
