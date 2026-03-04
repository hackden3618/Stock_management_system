import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, TrendingDown, RefreshCw, Package,
  DollarSign, Calendar, Brain, ChevronDown, ChevronUp,
  ArrowRight, ShieldAlert
} from 'lucide-react';
import { apiFetch } from '../lib/storage';

// ── Colours ───────────────────────────────────────────────────────
const C = {
  danger:  '#ef4444',
  warning: '#fbbf24',
  teal:    '#00897b',
  muted:   '#94a3b8',
  purple:  '#a78bfa',
  surface: 'rgba(255,255,255,0.04)',
};

function KshsShort(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `Kshs ${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `Kshs ${(v/1_000).toFixed(1)}K`;
  return `Kshs ${v.toFixed(0)}`;
}

// ── Rule-based strategist engine ──────────────────────────────────
// Analyses each expired batch and returns a structured advice object.
function buildAdvice(batch) {
  const {
    quantity, buying_price, selling_price, shelf_life_days,
    days_expired, units_sold_in_window, avg_daily_velocity, capital_locked
  } = batch;

  const qty         = Number(quantity);
  const buyP        = Number(buying_price);
  const sellP       = Number(selling_price);
  const shelfDays   = Number(shelf_life_days) || 30;
  const velocity    = Number(avg_daily_velocity);
  const soldWindow  = Number(units_sold_in_window);
  const daysExp     = Number(days_expired);

  // How many units should have sold during the shelf life at current velocity
  const expectedSales  = Math.round(velocity * shelfDays);
  const sellThrough    = expectedSales > 0 ? soldWindow / expectedSales : 0;
  const wasFastMover   = velocity >= 2;      // sold ≥2 units/day on average
  const wasSlowMover   = velocity < 0.5;     // sold <1 unit every 2 days
  const overStocked    = qty > expectedSales * 1.5 && expectedSales > 0;
  const margin         = sellP > 0 ? (sellP - buyP) / sellP : 0;
  const highMargin     = margin > 0.35;
  const daysExpiredLow = daysExp <= 7;

  // Break-even price (buy cost = min acceptable sell)
  const breakEven      = (buyP * 1.02).toFixed(2);
  // Clearance price: 70% of buying cost recovers most capital
  const clearancePrice = (buyP * 0.7).toFixed(2);

  const tips = [];

  // 1. Stocking size advice
  if (overStocked) {
    const safeQty = Math.max(1, Math.ceil(velocity * (shelfDays * 0.7)));
    tips.push({
      icon: '📦',
      type: 'RESTOCK_SMALLER',
      severity: 'high',
      title: 'You over-ordered for your sales velocity',
      body: `At your average pace of ${velocity.toFixed(1)} units/day, you only needed ~${safeQty} units for a ${shelfDays}-day shelf life. You stocked ${qty}. Next time order ≤ ${safeQty} units.`
    });
  } else if (wasSlowMover) {
    tips.push({
      icon: '🐢',
      type: 'SLOW_MOVER',
      severity: 'high',
      title: 'This is a slow-moving product',
      body: `Average velocity is ${velocity.toFixed(2)} units/day. With a ${shelfDays}-day shelf life you can only safely stock ${Math.max(1, Math.floor(velocity * shelfDays))} units. Consider if this product earns its shelf space.`
    });
  }

  // 2. Pricing advice (if still had margin room)
  if (highMargin && !wasFastMover) {
    const targetPrice = (buyP * 1.10).toFixed(2);
    tips.push({
      icon: '💰',
      type: 'PRICE_TOO_HIGH',
      severity: 'medium',
      title: 'High margin slowed movement',
      body: `Margin was ${Math.round(margin*100)}% — well above the market average. A price closer to Kshs ${targetPrice} (+10% on cost) likely would have moved it before expiry.`
    });
  }

  // 3. Discount-early advice
  if (shelfDays > 0) {
    const discountTrigger = Math.round(shelfDays * 0.25); // last 25% of shelf life
    tips.push({
      icon: '🏷️',
      type: 'DISCOUNT_EARLY',
      severity: 'medium',
      title: `Apply clearance discount ${discountTrigger} days before expiry`,
      body: `When ${discountTrigger} days remain, drop price to Kshs ${clearancePrice} (70% of cost). You still partially recover capital and clear shelf space. Zero recovery beats full loss.`
    });
  }

  // 4. Display & placement tip for slow movers
  if (wasSlowMover || sellThrough < 0.4) {
    tips.push({
      icon: '🏪',
      type: 'PLACEMENT',
      severity: 'low',
      title: 'Move this product to eye-level or bundle it',
      body: `Products with low velocity benefit from prime shelf placement or bundling with fast movers (e.g. "Buy 2 sausages, get 1 bread"). This can 2–3× movement without a price cut.`
    });
  }

  // 5. Avoid re-ordering advice for very slow movers
  if (wasSlowMover && shelfDays < 30) {
    tips.push({
      icon: '🚫',
      type: 'AVOID_REORDER',
      severity: 'high',
      title: 'Consider dropping this SKU',
      body: `Short shelf life + slow sales is a losing combination. Unless a supplier promotion or seasonal demand changes, this product will likely expire again. Free up the capital for faster movers.`
    });
  }

  // 6. Fast-mover that expired — stocking rhythm issue
  if (wasFastMover && sellThrough > 0.8) {
    tips.push({
      icon: '⚡',
      type: 'TIMING',
      severity: 'low',
      title: 'Good mover — timing issue, not demand',
      body: `You sold ${soldWindow} units during the batch window (${Math.round(sellThrough*100)}% sell-through). This expiry was likely a late delivery or seasonal dip. Tighten reorder timing rather than cutting quantities.`
    });
  }

  const severityScore = tips.filter(t => t.severity === 'high').length * 3
                      + tips.filter(t => t.severity === 'medium').length;

  return { tips, severityScore, breakEven, clearancePrice, sellThrough };
}

// ── Single expired batch card ─────────────────────────────────────
function ExpiredCard({ batch }) {
  const [open, setOpen] = useState(false);
  const advice = buildAdvice(batch);
  const daysAgo = Number(batch.days_expired);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid rgba(239,68,68,0.25)`,
      borderLeft: `4px solid ${C.danger}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>

        {/* Product image / icon */}
        <div style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-app)', display: 'grid', placeItems: 'center' }}>
          {batch.image_path
            ? <img src={batch.image_path} alt={batch.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Package size={22} color={C.danger} />}
        </div>

        {/* Name + expiry */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{batch.name}</span>
            <span style={{ background: 'rgba(239,68,68,0.12)', color: C.danger, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              EXPIRED {daysAgo}d ago
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginTop: 3 }}>
            Batch of {batch.quantity} units · Expired {batch.expiry_date} · Received {batch.batch_received?.slice(0,10)}
          </p>
        </div>

        {/* Loss pill */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 2 }}>Capital lost</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 900, color: C.danger }}>
            {KshsShort(batch.capital_locked)}
          </p>
          <p style={{ fontSize: '0.68rem', color: C.muted }}>
            {batch.quantity} × Kshs {Number(batch.buying_price).toFixed(2)}
          </p>
        </div>

        {/* Toggle */}
        <button onClick={() => setOpen(o => !o)} style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: C.danger,
          fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          <Brain size={14} />
          Strategist
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Strategist advice panel */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', padding: '18px 20px', background: 'rgba(239,68,68,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={16} color={C.purple} />
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: C.purple }}>Strategist Analysis</span>
            <span style={{ fontSize: '0.72rem', color: C.muted, marginLeft: 4 }}>
              Avg velocity: {Number(batch.avg_daily_velocity).toFixed(2)} units/day · 
              Sold in window: {batch.units_sold_in_window} units ·
              Sell-through: {Math.round(advice.sellThrough * 100)}%
            </span>
          </div>

          {advice.tips.length === 0 ? (
            <p style={{ color: C.muted, fontSize: '0.85rem' }}>Not enough sales history to generate advice. Make more sales to unlock insights.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {advice.tips.map((tip, i) => (
                <div key={i} style={{
                  background: tip.severity === 'high' ? 'rgba(239,68,68,0.07)'
                            : tip.severity === 'medium' ? 'rgba(251,191,36,0.07)'
                            : 'rgba(148,163,184,0.06)',
                  border: `1px solid ${
                    tip.severity === 'high'   ? 'rgba(239,68,68,0.2)'
                    : tip.severity === 'medium' ? 'rgba(251,191,36,0.2)'
                    : 'rgba(148,163,184,0.1)'
                  }`,
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <p style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{tip.icon}</span>
                    <span style={{ color: tip.severity === 'high' ? C.danger : tip.severity === 'medium' ? C.warning : C.muted }}>
                      {tip.title}
                    </span>
                  </p>
                  <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{tip.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function ExpiredStock() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const json = await apiFetch('getExpiredStock');
      if (json && json.status === 'success') setData(json.data);
      else setError(json?.message || 'Failed to load expired stock.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const batches = data?.batches || [];

  // Group by severity: worst losses first
  const sorted = [...batches].sort((a, b) => Number(b.capital_locked) - Number(a.capital_locked));

  return (
    <div className="fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'grid', placeItems: 'center' }}>
            <ShieldAlert size={22} color={C.danger} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Expired Stock</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>These items cannot be sold. Losses are recorded in your P&L.</p>
          </div>
        </div>
        <button onClick={fetchData} className="theme-toggle-btn" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: C.danger, fontSize: '0.88rem', marginBottom: 18 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Scanning expired inventory…</p>
        </div>

      ) : batches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 70 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No expired stock!</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Your FEFO rotation is working. Keep monitoring the Expiring Soon section.</p>
        </div>

      ) : (
        <>
          {/* Loss summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }} className="responsive-grid-3">
            <div className="card" style={{ borderLeft: `3px solid ${C.danger}` }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>💸 Total Capital Lost</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: C.danger }}>{KshsShort(data.total_loss)}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Recorded as business loss</p>
            </div>
            <div className="card" style={{ borderLeft: `3px solid ${C.warning}` }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>📦 Expired Units</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: C.warning }}>{data.total_units}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Across {batches.length} batch{batches.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="card" style={{ borderLeft: `3px solid ${C.purple}` }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>🧠 Strategist Tips</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: C.purple }}>
                {batches.reduce((sum, b) => sum + buildAdvice(b).tips.length, 0)}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Click "Strategist" on any item</p>
            </div>
          </div>

          {/* Notice */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          }}>
            <AlertTriangle size={16} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
              <strong style={{ color: C.danger }}>These products cannot be sold</strong> — their expired batches are blocked from the cart.
              To sell this product again, go to <button onClick={() => navigate('/stock')} style={{ background: 'none', border: 'none', color: 'var(--primary-teal)', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '0.82rem' }}>Inventory</button> and add a fresh stock batch with a new expiry date.
              The expired quantity is permanently recorded as a loss in your P&L.
            </div>
          </div>

          {/* Expired batch cards */}
          <div>
            {sorted.map((batch, i) => (
              <ExpiredCard key={`${batch.product_id}-${batch.batch_id || i}`} batch={batch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
