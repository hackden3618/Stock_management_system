import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StorageKeys, StorageManager, API_BASE_URL } from '../lib/storage';
import { ShoppingCart, Search, Package, Image as ImageIcon } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [localSearch, setLocalSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('search') || '';

  useEffect(() => {
    const handleProductsUpdate = () => {
      const cached = StorageManager.get(StorageKeys.PRODUCTS) || [];
      setProducts(cached);
    };
    handleProductsUpdate();
    window.addEventListener('products-updated', handleProductsUpdate);
    return () => window.removeEventListener('products-updated', handleProductsUpdate);
  }, []);

  useEffect(() => {
    if (urlQuery) setLocalSearch(urlQuery);
  }, [urlQuery]);

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const handleQuantity = (id, val, stock) => {
    const v = parseInt(val) || 1;
    if (v > stock) {
      toast(`⚠️ Only ${stock} units available.`);
      setQuantities(prev => ({ ...prev, [id]: stock }));
    } else {
      setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));
    }
  };

  const getRecommendedPrice = (p) => {
    return (parseFloat(p.price) * 0.95).toFixed(2);
  };

  const addToCart = (product) => {
    const qty = quantities[product.id] || 1;
    
    if (qty > product.stock_quantity) {
      return toast(`❌ Cannot add ${qty}. Only ${product.stock_quantity} in stock.`);
    }

    let currentCart = [];
    try {
      currentCart = JSON.parse(localStorage.getItem('cart_items')) || [];
    } catch(e) {}
    
    const existing = currentCart.find(i => i.id === product.id);
    const totalInCart = existing ? existing.quantity + qty : qty;

    if (totalInCart > product.stock_quantity) {
      return toast(`❌ Limit reached. You already have ${existing?.quantity || 0} in cart.`);
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      currentCart.push({ ...product, quantity: qty });
    }
    
    localStorage.setItem('cart_items', JSON.stringify(currentCart));
    window.dispatchEvent(new Event('storage'));
    toast(`✅ Added ${qty}x ${product.name} to Cart.`);
  };

  const query = localSearch.toLowerCase();
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(query)
  );

  return (
    <div className="fade-in">
       {msg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: msg.startsWith('✅') ? 'var(--status-success)' : 'var(--status-danger)', color: 'white', padding: '12px 20px', borderRadius: 10, zIndex: 9999, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{msg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🛒 Sell Products</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.9rem' }}>Select products for POS checkout</p>
        </div>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            style={{ padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className="ecom-grid">
        {filteredProducts.map(product => {
          const isOutOfStock = product.stock_quantity <= 0;
          const recPrice = getRecommendedPrice(product);
          
          return (
            <div key={product.id} className="ecom-card" style={{ opacity: isOutOfStock ? 0.7 : 1 }}>
              <div className="ecom-card-img">
                {product.image_path ? (
                  <img src={product.image_path} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                   <ImageIcon size={48} color="var(--border-light)" />
                )}
                {isOutOfStock && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                    OUT OF STOCK
                  </div>
                )}
              </div>
              <div className="ecom-card-body">
                <p className="ecom-card-name" style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>{product.name}</p>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                   <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Kshs. {parseFloat(product.price).toFixed(2)}</span>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>rec. {recPrice}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, gap: 4 }}>
                  <span style={{ fontSize: '0.85rem', color: isOutOfStock ? 'var(--status-danger)' : 'var(--primary-teal)', fontWeight: 600 }}>
                    {product.stock_quantity} in stock
                  </span>
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>quantity:</label>
                  <input
                    type="number"
                    value={quantities[product.id] || 1}
                    onChange={e => handleQuantity(product.id, e.target.value, product.stock_quantity)}
                    min="1"
                    disabled={isOutOfStock}
                    style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', textAlign: 'center' }}
                  />
                </div>
              </div>
              <div className="ecom-card-footer" style={{ padding: '0 16px 16px' }}>
                <button
                  className="ecom-btn-cart"
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                  style={{ width: '100%', borderRadius: 8 }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
            <Package size={64} style={{ opacity: 0.1, marginBottom: 16 }} />
            <h3>No products found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
