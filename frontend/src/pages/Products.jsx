import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL, getCart, saveCart } from '../lib/storage';
import { Search, Package, Image as ImageIcon, RefreshCw } from 'lucide-react';

export default function Products() {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [quantities, setQuantities] = useState({});
  const [localSearch, setLocalSearch] = useState('');
  const [msg, setMsg]               = useState('');
  const [searchParams]              = useSearchParams();
  const urlQuery                    = searchParams.get('search') || '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}?action=getProducts`);
      const json = await res.json();
      if (json.status === 'success') setProducts(json.data || []);
    } catch {
      toast('⚠️ Could not reach server. Check the API is running.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
    if (urlQuery) setLocalSearch(urlQuery);
  }, [fetchProducts, urlQuery]);

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const handleQuantity = (id, val, stock) => {
    const v = Math.max(1, parseInt(val) || 1);
    if (v > stock) {
      toast(`⚠️ Only ${stock} units available.`);
      setQuantities(prev => ({ ...prev, [id]: stock }));
    } else {
      setQuantities(prev => ({ ...prev, [id]: v }));
    }
  };

  const addToCart = (product) => {
    const qty = quantities[product.id] || 1;

    if (product.stock_quantity <= 0) return toast(`❌ ${product.name} is out of stock.`);
    if (qty > product.stock_quantity) return toast(`❌ Only ${product.stock_quantity} in stock.`);

    const cart     = getCart();
    const existing = cart.find(i => i.id === product.id);
    const totalQty = existing ? existing.quantity + qty : qty;

    if (totalQty > product.stock_quantity) {
      return toast(`❌ Cart already has ${existing?.quantity || 0}. Only ${product.stock_quantity} available.`);
    }

    if (existing) {
      existing.quantity = totalQty;
    } else {
      cart.push({ ...product, quantity: qty });
    }

    saveCart(cart);
    toast(`✅ Added ${qty}× ${product.name} to cart.`);
  };

  const query            = localSearch.toLowerCase();
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(query));

  return (
    <div className="fade-in">
      {msg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: msg.startsWith('✅') ? 'var(--status-success)' : msg.startsWith('⚠️') ? 'var(--status-warning)' : 'var(--status-danger)',
          color: 'white', padding: '12px 20px', borderRadius: 10, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>{msg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🛒 Sell Products</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.9rem' }}>Select products and add to cart</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products…"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              style={{ padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <button onClick={fetchProducts} className="theme-toggle-btn" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading products…</p>
        </div>
      ) : (
        <div className="ecom-grid">
          {filteredProducts.map(product => {
            const isOut = product.stock_quantity <= 0;
            const isLow = product.stock_quantity > 0 && product.stock_quantity < 10;

            return (
              <div key={product.id} className="ecom-card" style={{ opacity: isOut ? 0.65 : 1 }}>
                <div className="ecom-card-img" style={{ position: 'relative' }}>
                  {product.image_path ? (
                    <img src={product.image_path} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                      <ImageIcon size={44} color="var(--border-light)" />
                    </div>
                  )}
                  {isOut && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1 }}>
                      OUT OF STOCK
                    </div>
                  )}
                  {!isOut && isLow && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--status-warning)', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700 }}>
                      LOW STOCK
                    </div>
                  )}
                </div>

                <div className="ecom-card-body">
                  <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{product.name}</p>
                  <p style={{ textAlign: 'center', fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-teal)' }}>
                    Kshs {parseFloat(product.price).toFixed(2)}
                  </p>
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: 6, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {product.stock_quantity} in stock
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => handleQuantity(product.id, (quantities[product.id] || 1) - 1, product.stock_quantity)}
                      disabled={isOut || (quantities[product.id] || 1) <= 1}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', display: 'grid', placeItems: 'center' }}
                    >−</button>
                    <input
                      type="number"
                      value={quantities[product.id] || 1}
                      onChange={e => handleQuantity(product.id, e.target.value, product.stock_quantity)}
                      min="1"
                      max={product.stock_quantity}
                      disabled={isOut}
                      style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', textAlign: 'center', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleQuantity(product.id, (quantities[product.id] || 1) + 1, product.stock_quantity)}
                      disabled={isOut || (quantities[product.id] || 1) >= product.stock_quantity}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', display: 'grid', placeItems: 'center' }}
                    >+</button>
                  </div>
                </div>

                <div className="ecom-card-footer" style={{ padding: '0 14px 14px' }}>
                  <button
                    className="ecom-btn-cart"
                    onClick={() => addToCart(product)}
                    disabled={isOut}
                    style={{ width: '100%', borderRadius: 8 }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <Package size={56} style={{ opacity: 0.12, marginBottom: 14 }} />
              <h3>No products found</h3>
              <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Try a different search, or add products in Buy Products.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
