import { useState, useEffect } from 'react';
import { StorageManager, StorageKeys, API_BASE_URL } from '../lib/storage';
import { Package, Plus, X, Edit, RefreshCw, PlusCircle, Image as ImageIcon, TrendingUp } from 'lucide-react';

const EMPTY_NEW  = { name: '', price: '', total_batch_cost: '', quantity: '', expiry_date: '', image_path: '' };
const EMPTY_RECV = { quantity: '', total_batch_cost: '', expiry_date: '' };

async function apiCall(action, body) {
  const res = await fetch(`${API_BASE_URL}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function refreshProducts(setProducts) {
  try {
    const res = await fetch(`${API_BASE_URL}?action=getProducts`);
    if (res.ok) {
      const d = await res.json();
      const prods = d.data || [];
      StorageManager.set(StorageKeys.PRODUCTS, prods);
      window.dispatchEvent(new CustomEvent('products-updated'));
      setProducts(prods);
    }
  } catch {}
}

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
    <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.1rem' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

export default function Stock() {
  const [products, setProducts]         = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [search, setSearch]             = useState('');

  const [addModal, setAddModal]         = useState(false);
  const [editModal, setEditModal]       = useState(null);
  const [receiveModal, setReceiveModal] = useState(null);

  const [addForm, setAddForm]     = useState(EMPTY_NEW);
  const [editForm, setEditForm]   = useState({ name: '', price: '', image_path: '' });
  const [recvForm, setRecvForm]   = useState(EMPTY_RECV);
  const [busy, setBusy]           = useState(false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingProds(true);
      await refreshProducts(setProducts);
      setLoadingProds(false);
    };
    load();
    const handler = () => setProducts(StorageManager.get(StorageKeys.PRODUCTS) || []);
    window.addEventListener('products-updated', handler);
    return () => window.removeEventListener('products-updated', handler);
  }, []);

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };

  const handleImageSelect = (setForm, form) => {
    const url = prompt("Enter Image URL (e.g. https://...) or leave blank:", form.image_path);
    if (url !== null) setForm({ ...form, image_path: url });
  };

  const calculateUnitCost = (total, qty) => {
    const t = parseFloat(total) || 0;
    const q = parseInt(qty) || 0;
    return q > 0 ? (t / q).toFixed(2) : '0.00';
  };

  const getRecommendedPrice = (unitCost) => {
    const c = parseFloat(unitCost) || 0;
    if (c <= 0) return '0.00';
    const margin = c < 100 ? 1.35 : 1.25;
    return (c * margin).toFixed(2);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.price) return toast('❌ Name and selling price are required.');
    setBusy(true);
    const unitCost = calculateUnitCost(addForm.total_batch_cost, addForm.quantity);
    
    try {
      const result = await apiCall('addProduct', {
        name:         addForm.name,
        price:        parseFloat(addForm.price),
        buying_price: parseFloat(unitCost),
        quantity:     parseInt(addForm.quantity || 0),
        expiry_date:  addForm.expiry_date || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
        image_path:   addForm.image_path || null,
        expiry_days:  365
      });
      if (result.status === 'success') {
        toast(`✅ "${addForm.name}" added successfully!`);
        setAddModal(false);
        setAddForm(EMPTY_NEW);
        await refreshProducts(setProducts);
      } else {
        toast(`❌ ${result.message}`);
      }
    } catch {
      toast('❌ Network error — check API.');
    }
    setBusy(false);
  };

  const openEdit = (p) => {
    setEditModal(p);
    setEditForm({ name: p.name, price: p.price, image_path: p.image_path || '' });
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await apiCall('updateProduct', { 
        id: editModal.id, 
        name: editForm.name, 
        price: parseFloat(editForm.price),
        image_path: editForm.image_path 
      });
      if (result.status === 'success') {
        toast(`✅ "${editForm.name}" updated.`);
        setEditModal(null);
        await refreshProducts(setProducts);
      } else {
        toast(`❌ ${result.message}`);
      }
    } catch {
      toast('❌ Network error.');
    }
    setBusy(false);
  };

  const handleReceiveStock = async (e) => {
    e.preventDefault();
    if (!recvForm.quantity || !recvForm.total_batch_cost || !recvForm.expiry_date) return toast('❌ All fields required.');
    setBusy(true);
    const unitCost = calculateUnitCost(recvForm.total_batch_cost, recvForm.quantity);
    try {
      const result = await apiCall('addStock', {
        product_id:   receiveModal.id,
        quantity:     parseInt(recvForm.quantity),
        buying_price: parseFloat(unitCost),
        expiry_date:  recvForm.expiry_date,
      });
      if (result.status === 'success') {
        toast(`✅ Units of "${receiveModal.name}" received.`);
        setReceiveModal(null);
        setRecvForm(EMPTY_RECV);
        await refreshProducts(setProducts);
      } else {
        toast(`❌ ${result.message}`);
      }
    } catch {
      toast('❌ Network error.');
    }
    setBusy(false);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const stockStatus = (qty) => {
    qty = parseInt(qty);
    if (qty <= 0)  return { label: 'Out of Stock', color: 'var(--status-danger)',  bg: 'rgba(239,68,68,0.1)' };
    if (qty <= 10) return { label: 'Low Stock',    color: 'var(--status-warning)', bg: 'rgba(251,191,36,0.1)' };
    return              { label: 'In Stock',       color: 'var(--status-success)', bg: 'rgba(52,211,153,0.1)' };
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem' };
  const labelStyle = { display: 'block', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 6 };

  return (
    <div className="fade-in">
      {msg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: msg.startsWith('✅') ? 'var(--status-success)' : 'var(--status-danger)', color: 'white', padding: '12px 20px', borderRadius: 10, zIndex: 9999, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{msg}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={28} color="var(--primary-teal)" />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Buy Products / Inventory</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>Manage catalog and restock</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => refreshProducts(setProducts)} className="theme-toggle-btn"><RefreshCw size={14} /> Refresh</button>
          <button className="btn-primary" onClick={() => setAddModal(true)}><PlusCircle size={18} /> Add New Product</button>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 16 }} />
      </div>

      {loadingProds ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading catalog...</div>
      ) : (
        <div className="ecom-grid">
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No products found.</div>
          ) : filtered.map((p) => {
            const st = stockStatus(p.stock_quantity);
            return (
              <div key={p.id} className="ecom-card">
                <div className="ecom-card-img" style={{ position: 'relative' }}>
                  {p.image_path ? (
                    <img src={p.image_path} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-app)' }}>
                      <ImageIcon size={40} color="var(--border-light)" />
                    </div>
                  )}
                  <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: st.bg, color: st.color, backdropFilter: 'blur(4px)' }}>
                    {st.label} ({p.stock_quantity})
                  </span>
                </div>
                <div className="ecom-card-body">
                  <h4 className="ecom-product-name">{p.name}</h4>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4, color: 'var(--primary-teal)' }}>Kshs. {parseFloat(p.price).toFixed(2)}</p>
                </div>
                <div className="ecom-card-footer">
                  <button onClick={() => { setReceiveModal(p); setRecvForm(EMPTY_RECV); }} className="ecom-btn-cart"><Plus size={16} /> Buy Stock</button>
                  <button onClick={() => openEdit(p)} className="ecom-btn-sec"><Edit size={16} /> Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addModal && (
        <Modal title="➕ Register New Product" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div onClick={() => handleImageSelect(setAddForm, addForm)} style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border-light)', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {addForm.image_path ? <img src={addForm.image_path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} color="var(--text-muted)" />}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Product Name *</label>
                <input style={inputStyle} required placeholder="e.g. Omo 粉" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Quantity Received *</label>
                <input style={inputStyle} type="number" required min="1" value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Total Batch Price *</label>
                <input style={inputStyle} type="number" step="0.01" required min="1" value={addForm.total_batch_cost} onChange={e => setAddForm({ ...addForm, total_batch_cost: e.target.value })} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-app)', borderRadius: 12, padding: 14, border: '1px solid var(--border-light)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculated Unit Cost:</span>
                  <span style={{ fontWeight: 700 }}>Kshs. {calculateUnitCost(addForm.total_batch_cost, addForm.quantity)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={14}/> Recommendation:</span>
                  <span style={{ fontWeight: 800 }}>Kshs. {getRecommendedPrice(calculateUnitCost(addForm.total_batch_cost, addForm.quantity))}</span>
               </div>
            </div>

            <div>
              <label style={labelStyle}>Selling Price (per unit) *</label>
              <input style={{ ...inputStyle, border: '2px solid var(--primary-teal)', fontSize: '1.1rem', fontWeight: 700 }} type="number" step="0.01" min="1" required value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={busy} className="btn-primary" style={{ flex: 1, padding: '12px 0' }}>{busy ? 'Saving...' : '✅ Save Product'}</button>
              <button type="button" onClick={() => setAddModal(false)} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal title={`✏️ Edit Catalog Item`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div onClick={() => handleImageSelect(setEditForm, editForm)} style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border-light)', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                  {editForm.image_path ? <img src={editForm.image_path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} color="var(--text-muted)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Product Name</label>
                  <input style={inputStyle} required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
            </div>
            <div>
              <label style={labelStyle}>Selling Price (Kshs)</label>
              <input style={inputStyle} type="number" step="0.01" min="1" required value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="submit" disabled={busy} className="btn-primary" style={{ flex: 1, padding: '12px 0' }}>{busy ? 'Saving...' : '💾 Save Changes'}</button>
              <button type="button" onClick={() => setEditModal(null)} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {receiveModal && (
        <Modal title={`📥 Buy More stock: ${receiveModal.name}`} onClose={() => setReceiveModal(null)}>
          <form onSubmit={handleReceiveStock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Quantity Received *</label>
                <input style={inputStyle} type="number" required min="1" value={recvForm.quantity} onChange={e => setRecvForm({ ...recvForm, quantity: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Total Batch Price *</label>
                <input style={inputStyle} type="number" step="0.01" required min="1" value={recvForm.total_batch_cost} onChange={e => setRecvForm({ ...recvForm, total_batch_cost: e.target.value })} />
              </div>
            </div>
            <div style={{ background: 'var(--bg-app)', borderRadius: 12, padding: 14, border: '1px solid var(--border-light)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: '0.8rem' }}>New Unit Cost:</span><span style={{ fontWeight: 700 }}>Kshs. {calculateUnitCost(recvForm.total_batch_cost, recvForm.quantity)}</span></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)', fontSize: '0.85rem' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={14}/> Recommendation:</span><span style={{ fontWeight: 800 }}>Kshs. {getRecommendedPrice(calculateUnitCost(recvForm.total_batch_cost, recvForm.quantity))}</span></div>
            </div>
            <div>
              <label style={labelStyle}>Expiry Date *</label>
              <input style={inputStyle} type="date" required value={recvForm.expiry_date} onChange={e => setRecvForm({ ...recvForm, expiry_date: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={busy} className="btn-primary" style={{ flex: 1, padding: '12px 0', background: 'var(--status-success)' }}>{busy ? 'Saving...' : '📥 Confirm Purchase'}</button>
              <button type="button" onClick={() => setReceiveModal(null)} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid var(--border-light)', borderRadius: 10, color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
