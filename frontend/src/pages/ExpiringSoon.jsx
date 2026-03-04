import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, Package, Tag, TrendingDown, Brain, Zap } from 'lucide-react';
import { apiFetch } from '../lib/storage';

const C = { danger:'#ef4444', warning:'#fbbf24', teal:'#00897b', muted:'#94a3b8', green:'#34d399', orange:'#f97316' };

function KshsShort(n) {
  const v = Number(n||0);
  if (v>=1_000_000) return `Kshs ${(v/1_000_000).toFixed(1)}M`;
  if (v>=1_000)     return `Kshs ${(v/1_000).toFixed(1)}K`;
  return `Kshs ${v.toFixed(0)}`;
}

// ── Advice for items expiring soon ────────────────────────────────
function buildUrgencyAdvice(batch) {
  const daysLeft     = Number(batch.days_left);
  const qty          = Number(batch.quantity);
  const velocity     = Number(batch.avg_daily_velocity);
  const buyP         = Number(batch.buying_price);
  const sellP        = Number(batch.selling_price);
  const capitalRisk  = Number(batch.capital_at_risk);
  const shelfLife    = Number(batch.shelf_life_days) || 30;

  // Units we can realistically sell at current velocity before expiry
  const projectedSales = Math.round(velocity * daysLeft);
  const willExpire     = projectedSales < qty;
  const unitsAtRisk    = Math.max(0, qty - projectedSales);
  const capitalAtRisk  = unitsAtRisk * buyP;

  // Urgency level
  const urgency = daysLeft <= 2 ? 'critical' : daysLeft <= 5 ? 'high' : daysLeft <= 10 ? 'medium' : 'low';

  // Discount to clear remaining stock
  // Target: move qty/daysLeft units per day = needed velocity
  const neededVelocity  = daysLeft > 0 ? qty / daysLeft : qty;
  const velocityMultiple = velocity > 0 ? neededVelocity / velocity : 0;

  // Price elasticity rule of thumb: each 10% discount ≈ 20% velocity increase
  // So to achieve X× velocity, discount ≈ (X-1)/2 * 10%
  const rawDiscountPct = velocityMultiple > 1
    ? Math.min(60, Math.round(((velocityMultiple - 1) / 2) * 10))
    : 10;
  const discountPct    = Math.max(10, rawDiscountPct);
  const discountPrice  = Math.max(buyP * 0.7, sellP * (1 - discountPct / 100));
  const breakEven      = buyP * 1.02;

  const tips = [];

  if (willExpire && unitsAtRisk > 0) {
    tips.push({
      icon: '🏷️',
      type: 'DISCOUNT_NOW',
      severity: 'high',
      title: `Discount to ${discountPct}% off — price Kshs ${discountPrice.toFixed(2)}`,
      body: `At ${velocity.toFixed(2)} units/day you'll only move ${projectedSales} of ${qty} units. ${unitsAtRisk} units (Kshs ${capitalAtRisk.toFixed(0)}) are at risk. A ${discountPct}% discount should bring needed velocity.`
    });
  }

  if (daysLeft <= 3) {
    tips.push({
      icon: '📣',
      type: 'ANNOUNCE',
      severity: 'high',
      title: 'Announce a flash sale today',
      body: `Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left. Tell regular customers directly — SMS, WhatsApp group, or a handwritten sign at the counter. Urgency converts browsers to buyers.`
    });
  }

  tips.push({
    icon: '🎁',
    type: 'BUNDLE',
    severity: 'medium',
    title: 'Bundle with a fast-moving product',
    body: `Pair this item with your best seller at a combined price. Customers perceive value, and you move the expiring item without a visible "discount" that damages brand perception.`
  });

  if (daysLeft <= 7 && velocity < 1) {
    tips.push({
      icon: '🏪',
      type: 'PLACEMENT',
      severity: 'medium',
      title: 'Move to primary shelf / counter display',
      body: `Eye-level and counter placements increase impulse purchases by 30–70%. For ${daysLeft} days this costs nothing and can make the difference.`
    });
  }

  if (sellP > breakEven * 1.3) {
    tips.push({
      icon: '💡',
      type: 'BREAKEVEN',
      severity: 'low',
      title: `Minimum price to stay profitable: Kshs ${breakEven.toFixed(2)}`,
      body: `Even at break-even you recover capital and avoid a 100% loss. Selling at Kshs ${breakEven.toFixed(2)} is far better than writing off Kshs ${capitalRisk.toFixed(0)}.`
    });
  }

  return { tips, urgency, willExpire, unitsAtRisk, projectedSales, discountPct, discountPrice };
}

function urgencyStyle(level) {
  switch (level) {
    case 'critical': return { color: C.danger,  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  label: '🔴 CRITICAL' };
    case 'high':     return { color: C.orange,  bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)', label: '🟠 URGENT' };
    case 'medium':   return { color: C.warning, bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.25)', label: '🟡 WATCH' };
    default:         return { color: C.teal,    bg: 'rgba(0,137,123,0.07)', border: 'rgba(0,137,123,0.2)',  label: '🟢 MONITOR' };
  }
}

function ExpiringCard({ batch }) {
  const [open, setOpen] = useState(false);
  const advice  = buildUrgencyAdvice(batch);
  const uStyle  = urgencyStyle(advice.urgency);
  const daysLeft = Number(batch.days_left);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${uStyle.border}`,
      borderLeft: `4px solid ${uStyle.color}`,
      borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    }}>
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', flexWrap: 'wrap' }}>

        <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-app)', display: 'grid', placeItems: 'center' }}>
          {batch.image_path
            ? <img src={batch.image_path} alt={batch.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <Package size={20} color={uStyle.color} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800 }}>{batch.name}</span>
            <span style={{ background: uStyle.bg, color: uStyle.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {uStyle.label} · {daysLeft}d left
            </span>
          </div>
          <p style={{ fontSize: '0.77rem', color: C.muted, marginTop: 3 }}>
            {batch.quantity} units · Expires {batch.expiry_date} · 
            Velocity {Number(batch.avg_daily_velocity).toFixed(2)}/day · 
            Capital at risk {KshsShort(batch.capital_at_risk)}
          </p>
        </div>

        {/* Projection pill */}
        <div style={{ background: advice.willExpire ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)', borderRadius: 8, padding: '6px 12px', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: '0.68rem', color: C.muted }}>Will sell before expiry</p>
          <p style={{ fontWeight: 800, fontSize: '0.9rem', color: advice.willExpire ? C.danger : C.green }}>
            {advice.willExpire ? `${advice.unitsAtRisk} units at risk` : '✓ On track'}
          </p>
        </div>

        <button onClick={() => setOpen(o => !o)} style={{
          background: uStyle.bg, border: `1px solid ${uStyle.border}`,
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: uStyle.color,
          fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          <Brain size={13} />
          Advice
        </button>
      </div>

      {/* Progress bar: days remaining as % of shelf life */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', margin: '0 18px 14px' }}>
        <div style={{
          height: '100%',
          width: `${Math.round((daysLeft / Math.max(Number(batch.shelf_life_days), daysLeft)) * 100)}%`,
          background: uStyle.color, borderRadius: 2, transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Advice panel */}
      {open && (
        <div style={{ borderTop: `1px solid ${uStyle.border}`, padding: '16px 18px', background: uStyle.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <Zap size={15} color={uStyle.color} fill={uStyle.color} />
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: uStyle.color }}>Action Plan</span>
            {advice.willExpire && (
              <span style={{ fontSize: '0.72rem', color: C.muted, marginLeft: 6 }}>
                Suggested discount: <strong style={{ color: uStyle.color }}>{advice.discountPct}% off → Kshs {advice.discountPrice.toFixed(2)}</strong>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {advice.tips.map((tip, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', borderRadius: 9, padding: '10px 13px',
                border: '1px solid var(--border-light)',
              }}>
                <p style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{tip.icon}</span>
                  <span style={{ color: tip.severity === 'high' ? uStyle.color : tip.severity === 'medium' ? C.warning : C.muted }}>
                    {tip.title}
                  </span>
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpiringSoon() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [window, setWindow]   = useState(14);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const json = await apiFetch('getExpiringSoon', null, `days=${window}`);
      if (json && json.status === 'success') setBatches(json.data);
      else setError(json?.message || 'Failed to load data.');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [window]);

  const critical = batches.filter(b => Number(b.days_left) <= 3);
  const urgent   = batches.filter(b => Number(b.days_left) > 3 && Number(b.days_left) <= 7);
  const watching = batches.filter(b => Number(b.days_left) > 7);

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(251,191,36,0.1)', display:'grid', placeItems:'center' }}>
            <Clock size={22} color={C.warning} />
          </div>
          <div>
            <h2 style={{ fontSize:'1.4rem', fontWeight:800 }}>Expiring Soon</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.83rem' }}>Act before these become losses. Strategist advice on each item.</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={window} onChange={e => setWindow(Number(e.target.value))}
            style={{ padding:'7px 12px', borderRadius:9, border:'1px solid var(--border-light)', background:'var(--bg-surface)', color:'var(--text-main)', fontSize:'0.82rem', cursor:'pointer' }}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={21}>Next 21 days</option>
            <option value={30}>Next 30 days</option>
          </select>
          <button onClick={fetchData} className="theme-toggle-btn" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 16px', color:C.danger, marginBottom:18 }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <RefreshCw size={26} className="spin" style={{ margin:'0 auto 12px' }} />
          <p>Scanning expiry dates…</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:70 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>✅</div>
          <h3 style={{ fontSize:'1.1rem', fontWeight:700 }}>Nothing expiring in the next {window} days</h3>
          <p style={{ color:'var(--text-muted)', marginTop:8 }}>Your stock rotation is healthy.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:22 }} className="responsive-grid-3">
            <div className="card" style={{ borderLeft:`3px solid ${C.danger}`, padding:14 }}>
              <p style={{ fontSize:'0.72rem', color:C.muted }}>🔴 Critical (≤3 days)</p>
              <p style={{ fontSize:'1.4rem', fontWeight:900, color:C.danger }}>{critical.length}</p>
            </div>
            <div className="card" style={{ borderLeft:`3px solid ${C.orange}`, padding:14 }}>
              <p style={{ fontSize:'0.72rem', color:C.muted }}>🟠 Urgent (4–7 days)</p>
              <p style={{ fontSize:'1.4rem', fontWeight:900, color:C.orange }}>{urgent.length}</p>
            </div>
            <div className="card" style={{ borderLeft:`3px solid ${C.warning}`, padding:14 }}>
              <p style={{ fontSize:'0.72rem', color:C.muted }}>🟡 Watching (8–{window} days)</p>
              <p style={{ fontSize:'1.4rem', fontWeight:900, color:C.warning }}>{watching.length}</p>
            </div>
          </div>

          {/* Sections */}
          {critical.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontSize:'0.88rem', fontWeight:800, color:C.danger, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                🔴 Critical — Take action today
              </h3>
              {critical.map((b, i) => <ExpiringCard key={i} batch={b} />)}
            </div>
          )}
          {urgent.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontSize:'0.88rem', fontWeight:800, color:C.orange, marginBottom:10 }}>🟠 Urgent — Act this week</h3>
              {urgent.map((b, i) => <ExpiringCard key={i} batch={b} />)}
            </div>
          )}
          {watching.length > 0 && (
            <div>
              <h3 style={{ fontSize:'0.88rem', fontWeight:800, color:C.warning, marginBottom:10 }}>🟡 Watching — Plan ahead</h3>
              {watching.map((b, i) => <ExpiringCard key={i} batch={b} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
