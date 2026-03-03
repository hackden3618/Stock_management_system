import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowLeft, CheckCircle, Package } from 'lucide-react';
import { StorageManager, StorageKeys } from '../lib/storage';

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('cart_items')) || [];
      setItems(data);
    } catch(e) { setItems([]); }
  }, []);

  const updateItems = (newItems) => {
    setItems(newItems);
    localStorage.setItem('cart_items', JSON.stringify(newItems));
    window.dispatchEvent(new Event('storage'));
  };

  const removeItem = (id) => {
    updateItems(items.filter(i => i.id !== id));
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setBusy(true);

    const sale = {
      type: 'NEW_SALE',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        total_amount: total,
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          price: i.price
        }))
      }
    };

    StorageManager.addToQueue(sale);

    setSuccess(true);
    updateItems([]);
    setBusy(false);
    
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <CheckCircle size={80} color="var(--status-success)" style={{ marginBottom: 20 }} />
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Sale Completed!</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>The transaction is being synced silently in the background.</p>
        <button className="btn-primary" style={{ marginTop: 30, padding: '12px 30px' }} onClick={() => navigate('/')}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <button onClick={() => navigate('/products')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Checkout Cart</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: items.length > 0 ? '2fr 1fr' : '1fr', gap: 30 }}>
        {items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '100px 0' }}>
            <ShoppingCart size={64} style={{ opacity: 0.1, marginBottom: 20, margin: '0 auto' }} />
            <h3>Your cart is empty</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>Add some products from the shop to proceed.</p>
            <button className="btn-primary" style={{ marginTop: 30 }} onClick={() => navigate('/products')}>Browse Products</button>
          </div>
        ) : (
          <>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' }}>
                   <div style={{ width: 60, height: 60, borderRadius: 8, background: 'var(--bg-app)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {item.image_path ? <img src={item.image_path} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : <Package size={24} color="var(--text-muted)" />}
                   </div>
                   <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '1rem' }}>{item.name}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Kshs. {parseFloat(item.price).toFixed(2)} x {item.quantity}</p>
                   </div>
                   <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>Kshs. {(item.price * item.quantity).toFixed(2)}</p>
                   <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', padding: 10 }}>
                      <Trash2 size={18} />
                   </button>
                </div>
              ))}
            </div>

            <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 20 }}>
               <h3 style={{ fontSize: '1.2rem' }}>Order Summary</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span>Subtotal:</span>
                  <span>Kshs. {total.toFixed(2)}</span>
               </div>
               <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-teal)' }}>
                  <span>Total:</span>
                  <span>Kshs. {total.toFixed(2)}</span>
               </div>
               <button 
                  className="btn-primary" 
                  style={{ padding: '16px', fontSize: '1.1rem', marginTop: 10 }}
                  disabled={busy}
                  onClick={handleCheckout}
               >
                  {busy ? 'Processing...' : 'Complete Sale & Sync'}
               </button>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Transactions are cached locally and synced silently.
               </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
