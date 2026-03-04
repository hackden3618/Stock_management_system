import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/storage';
import {
  TrendingUp, AlertCircle, RefreshCw, PackageX, Flame,
  ShoppingBag, DollarSign, BarChart2, Clock, ShieldAlert
} from 'lucide-react';

function KshsShort(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `Kshs ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `Kshs ${(v / 1_000).toFixed(1)}K`;
  return `Kshs ${v.toFixed(0)}`;
}

// Explicit hex colours — CSS vars don't resolve inside SVG fill attributes
const C = {
  teal:    '#00897b',
  blue:    '#60a5fa',
  purple:  '#a78bfa',
  amber:   '#fbbf24',
  green:   '#34d399',
  danger:  '#ef4444',
  warning: '#fbbf24',
  orange:  '#f97316',
  muted:   '#94a3b8',
  track:   'rgba(255,255,255,0.05)',
};

// ─────────────────────────────────────────────────────────────────────
// BAR CHART
// viewBox 560 wide → bars & labels are in screen-pixel-like space,
// so text never gets stretched by preserveAspectRatio="none"
// ─────────────────────────────────────────────────────────────────────
function BarChart({ data, color = C.teal, valueKey = 'revenue', chartHeight = 150 }) {
  if (!data || data.length === 0) return (
    <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '0.82rem' }}>
      No sales data yet — make a sale to see this chart
    </div>
  );

  const VW    = 560;                // fixed viewBox width
  const PAD_T = 22;
  const PAD_B = 22;
  const plotH = chartHeight - PAD_T - PAD_B;
  const maxV  = Math.max(...data.map(d => Number(d[valueKey]) || 0), 0.01);
  const bW    = VW / data.length;
  const GAP   = bW * 0.18;
  // Only show every Nth label so they never overlap (target ≤ 7 labels)
  const step  = Math.ceil(data.length / 7);

  return (
    <svg viewBox={`0 0 ${VW} ${chartHeight}`} width="100%" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const raw  = Number(d[valueKey]) || 0;
        const barH = raw > 0 ? Math.max((raw / maxV) * plotH, 3) : 0;
        const x    = i * bW + GAP / 2;
        const w    = bW - GAP;
        const y    = PAD_T + plotH - barH;
        const lbl  = d.label || (d.date ? d.date.slice(5) : String(i));
        const showLbl = (i % step === 0) || (i === data.length - 1);

        return (
          <g key={i}>
            {/* track */}
            <rect x={x} y={PAD_T} width={w} height={plotH} rx="3" fill={C.track} />
            {/* bar */}
            {barH > 0 && <rect x={x} y={y} width={w} height={barH} rx="3" fill={color} opacity="0.88" />}
            {/* value above bar */}
            {barH > 8 && (
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
                {KshsShort(raw).replace('Kshs ', '')}
              </text>
            )}
            {/* date label — only every Nth */}
            {showLbl && (
              <text x={x + w / 2} y={chartHeight - 4} textAnchor="middle" fontSize="9" fill={C.muted}>
                {lbl}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LINE CHART
// ─────────────────────────────────────────────────────────────────────
function LineChart({ data, color = C.purple, valueKey = 'profit', chartHeight = 150 }) {
  const hasData = data && data.length >= 2 && data.some(d => Number(d[valueKey]) > 0);
  if (!hasData) return (
    <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '0.82rem' }}>
      {(!data || data.length < 2) ? 'Need more sales days to show trend' : 'Profit data will appear after sales sync'}
    </div>
  );

  const VW    = 560;
  const PAD_T = 16;
  const PAD_B = 22;
  const plotH = chartHeight - PAD_T - PAD_B;
  const maxV  = Math.max(...data.map(d => Number(d[valueKey]) || 0), 0.01);
  const stepX = VW / (data.length - 1);
  const step  = Math.ceil(data.length / 7);

  const pts = data.map((d, i) => ({
    x: i * stepX,
    y: PAD_T + plotH - ((Number(d[valueKey]) || 0) / maxV) * plotH,
  }));

  const line = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `0,${PAD_T + plotH} ${line} ${VW},${PAD_T + plotH}`;

  return (
    <svg viewBox={`0 0 ${VW} ${chartHeight}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lineGrad)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const lbl     = data[i].label || (data[i].date ? data[i].date.slice(5) : '');
        const showLbl = (i % step === 0) || (i === data.length - 1);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            {showLbl && (
              <text x={p.x} y={chartHeight - 4} textAnchor="middle" fontSize="9" fill={C.muted}>{lbl}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HOURLY BAR CHART — fixed 24-slot grid, bars placed at correct hour
// ─────────────────────────────────────────────────────────────────────
function HourlyChart({ data, chartHeight = 90 }) {
  const VW    = 560;
  const PAD_T = 18;
  const PAD_B = 20;
  const plotH = chartHeight - PAD_T - PAD_B;
  const slots = 24;
  const bW    = VW / slots;
  const GAP   = bW * 0.2;

  // Build hour → value map
  const byHour = {};
  (data || []).forEach(d => { byHour[Number(d.hr)] = Number(d.revenue) || 0; });
  const maxV = Math.max(...Object.values(byHour), 0.01);

  // Only label every 3rd hour: 0, 3, 6, 9 ...
  const labelHours = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

  return (
    <svg viewBox={`0 0 ${VW} ${chartHeight}`} width="100%" style={{ display: 'block' }}>
      {Array.from({ length: slots }, (_, hr) => {
        const raw  = byHour[hr] || 0;
        const barH = raw > 0 ? Math.max((raw / maxV) * plotH, 3) : 0;
        const x    = hr * bW + GAP / 2;
        const w    = bW - GAP;
        const y    = PAD_T + plotH - barH;

        return (
          <g key={hr}>
            <rect x={x} y={PAD_T} width={w} height={plotH} rx="2" fill={C.track} />
            {barH > 0 && <rect x={x} y={y} width={w} height={barH} rx="2" fill={C.blue} opacity="0.88" />}
            {barH > 8 && (
              <text x={x + w / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={C.blue} fontWeight="700">
                {KshsShort(raw).replace('Kshs ', '')}
              </text>
            )}
            {labelHours.has(hr) && (
              <text x={x + w / 2} y={chartHeight - 4} textAnchor="middle" fontSize="9" fill={C.muted}>
                {hr}h
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TURNOVER GAUGE
// Standard SVG trig: pt(deg) = cx + r·cos(deg·π/180), cy - r·sin(deg·π/180)
// This maps: 0°=right  90°=UP(top)  180°=left  270°=down
// Gauge arc: left (180°) → top (90°) → right (0°)   sweep-flag = 0
// Fill arc:  left (180°) → fillAngle = 180 − pct·180  sweep-flag = 0
// ─────────────────────────────────────────────────────────────────────
function TurnoverGauge({ value, max = 10 }) {
  const pct = Math.min(value / max, 1);
  const cx  = 60;
  const cy  = 58;
  const r   = 40;
  const col = pct < 0.3 ? C.danger : pct < 0.65 ? C.warning : C.green;
  const lbl = pct >= 0.65 ? 'Healthy' : pct >= 0.3 ? 'Average' : 'Low';

  // Point on arc in SVG coords (y increases DOWN, so we NEGATE sin)
  const pt = (deg) => ({
    x: cx + r * Math.cos(deg * Math.PI / 180),
    y: cy - r * Math.sin(deg * Math.PI / 180),
  });

  const L = pt(180);  // left endpoint
  const R = pt(0);    // right endpoint

  // Background semicircle: 180° → 0° counterclockwise (through top)
  // large-arc = 0, sweep = 0 (counterclockwise in SVG = going through top)
  const bgArc = `M ${L.x} ${L.y} A ${r} ${r} 0 0 0 ${R.x} ${R.y}`;

  // Fill arc: 180° → fillDeg counterclockwise
  const fillDeg  = 180 - pct * 180;           // 180 at pct=0 (left), 0 at pct=1 (right)
  const fillEnd  = pt(fillDeg);
  const largeArc = pct > 0.5 ? 1 : 0;
  const fillArc  = pct > 0
    ? `M ${L.x} ${L.y} A ${r} ${r} 0 ${largeArc} 0 ${fillEnd.x} ${fillEnd.y}`
    : null;

  // Needle tip
  const tip = pt(fillDeg);
  const nx  = cx + (r - 10) * Math.cos(fillDeg * Math.PI / 180);
  const ny  = cy - (r - 10) * Math.sin(fillDeg * Math.PI / 180);

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <svg viewBox="0 0 120 76" width="100%" style={{ display: 'block', maxWidth: 200, margin: '0 auto' }}>
        {/* Track */}
        <path d={bgArc} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" />
        {/* Coloured fill */}
        {fillArc && (
          <path d={fillArc} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${col}88)` }} />
        )}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={col} />
        {/* End-point labels */}
        <text x={L.x - 4} y={L.y + 5} textAnchor="end"   fontSize="7" fill={C.muted}>0</text>
        <text x={R.x + 4} y={R.y + 5} textAnchor="start" fontSize="7" fill={C.muted}>{max}×</text>
        {/* Value */}
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="13" fontWeight="800" fill="white">{value}×</text>
      </svg>
      <p style={{ fontSize: '0.7rem', color: C.muted, marginTop: 4 }}>
        Stock Turnover · <span style={{ color: col, fontWeight: 700 }}>{lbl}</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HORIZONTAL BAR (Top Products)
// ─────────────────────────────────────────────────────────────────────
function HorizBars({ items }) {
  if (!items || items.length === 0) return (
    <p style={{ color: C.muted, fontSize: '0.82rem' }}>No sales data yet.</p>
  );
  const cols = [C.teal, C.blue, C.purple, C.amber, '#f472b6'];
  const max  = Math.max(...items.map(d => Number(d.units_sold) || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{item.name}</span>
            <span style={{ fontWeight: 700, color: cols[i % cols.length] }}>{item.units_sold} sold</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${(Number(item.units_sold) / max) * 100}%`,
              background: cols[i % cols.length],
              transition: 'width 0.7s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]         = useState(null);
  const [chart, setChart]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const prevSalesRef              = useRef(null);
  const [salesFlash, setSalesFlash] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [json, cj] = await Promise.all([
        apiFetch('getDashboardStats'),
        apiFetch('getSalesChart', null, 'days=14'),
      ]);
      if (json && json.status === 'success') {
          if (prevSalesRef.current !== null && json.data.sales_today !== prevSalesRef.current) {
            setSalesFlash(true);
            setTimeout(() => setSalesFlash(false), 1800);
          }
          prevSalesRef.current = json.data.sales_today;
          setStats(json.data);
          setLastFetch(new Date());
        }
      if (cj && cj.status === 'success') setChart(cj.data);
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  if (loading && !stats) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, color: C.muted }}>
      <RefreshCw size={34} className="spin" />
      <p>Loading dashboard…</p>
    </div>
  );

  const invVal       = stats?.inventory_value        ?? 0;
  const salesToday   = stats?.sales_today             ?? 0;
  const txToday      = stats?.tx_today                ?? 0;
  const burnRate     = stats?.burn_rate_per_day       ?? 0;
  const salesAll     = stats?.sales_all_time          ?? 0;
  const profitAll    = stats?.profit_all_time         ?? 0;
  const topProds     = stats?.top_products            ?? [];
  const deadStock    = stats?.dead_stock              ?? [];
  const outProds     = stats?.out_of_stock_products   ?? [];
  const lowProds     = stats?.low_stock_products      ?? [];
  const expiryAlerts = stats?.expiry_alerts           ?? [];
  const recentSales  = stats?.recent_sales            ?? [];
  const outCount     = stats?.out_of_stock_count      ?? 0;
  const lowCount     = stats?.low_stock_count         ?? 0;
  const turnover     = stats?.turnover_ratio          ?? 0;
  const totalLosses  = stats?.total_losses            ?? 0;
  const expiredCount = stats?.expired_count           ?? 0;

  const daily      = chart?.daily  ?? [];
  const hourly     = chart?.hourly ?? [];
  const alertTotal = outCount + lowCount + deadStock.length + expiryAlerts.length;

  const KpiCard = ({ icon, label, value, sub, border, flash, onClick }) => (
    <div className="card" onClick={onClick} style={{
      borderLeft: `3px solid ${border}`, cursor: onClick ? 'pointer' : undefined,
      transition: 'background 0.5s', background: flash ? `${border}18` : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: C.muted, fontSize: '0.77rem', marginBottom: 6 }}>{label}</p>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{value}</h3>
          {sub && <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: 4 }}>{sub}</p>}
        </div>
        <span style={{ color: border, opacity: 0.45, marginTop: 2 }}>{icon}</span>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>📊 Growth Dashboard</h2>
          <p style={{ color: C.muted, fontSize: '0.78rem' }}>
            {lastFetch ? `Updated ${lastFetch.toLocaleTimeString()}` : 'Connecting…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {alertTotal > 0 && (
            <button onClick={() => navigate('/notifications')} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(239,68,68,0.1)', padding: '5px 12px', borderRadius: 20,
              fontSize: '0.72rem', fontWeight: 600, color: C.danger,
              border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
            }}>
              <AlertCircle size={12} /> {alertTotal} Alert{alertTotal !== 1 ? 's' : ''}
            </button>
          )}
          <button onClick={fetchAll} className="theme-toggle-btn" style={{ padding: '6px 12px' }}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
        <KpiCard icon={<BarChart2 size={20}/>} label="📦 Inventory Value"  value={KshsShort(invVal)}   sub="Click to manage stock"                        border={C.teal}   onClick={() => navigate('/stock')} />
        <KpiCard icon={<ShoppingBag size={20}/>} label="💳 Sales Today"    value={KshsShort(salesToday)} sub={`${txToday} transaction${txToday !== 1 ? 's' : ''}`} border={C.blue}  flash={salesFlash} />
        <KpiCard icon={<DollarSign size={20}/>}  label="💰 Net Profit"     value={KshsShort(profitAll)}  sub="All-time FEFO"                                border={C.green} />
        <KpiCard icon={<TrendingUp size={20}/>}  label="🔥 Sales Velocity" value={KshsShort(burnRate) + '/day'} sub={`All-time: ${KshsShort(salesAll)}`}   border={C.amber} />
        <KpiCard icon={<ShieldAlert size={20}/>} label="💸 Expired Losses" value={KshsShort(totalLosses)} sub={`${expiredCount} product${expiredCount!==1?'s':''} with expired stock`} border="#ef4444" onClick={() => navigate('/expired-stock')} />
      </div>

      {/* ── 14-Day Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart2 size={15} color={C.teal} /> 14-Day Revenue
          </h3>
          <BarChart data={daily} color={C.teal} valueKey="revenue" chartHeight={148} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={15} color={C.purple} /> 14-Day Profit Trend
          </h3>
          <LineChart data={daily} color={C.purple} valueKey="profit" chartHeight={148} />
        </div>
      </div>

      {/* ── Gauge + Top Products + Recent ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.7fr 1.2fr', gap: 18 }}>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, alignSelf: 'flex-start' }}>📈 Turnover Ratio</h3>
          <TurnoverGauge value={turnover} max={10} />
          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}>
              <span style={{ color: C.muted }}>Today's Sales</span>
              <span style={{ color: C.teal, fontWeight: 700 }}>{KshsShort(salesToday)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem' }}>
              <span style={{ color: C.muted }}>Transactions</span>
              <span style={{ fontWeight: 700 }}>{txToday}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16 }}>🏆 Top Selling Products</h3>
          <HorizBars items={topProds} />
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 290 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={14} /> Recent Transactions
          </h3>
          {recentSales.length === 0 ? (
            <p style={{ color: C.muted, fontSize: '0.8rem' }}>No sales yet — make your first sale!</p>
          ) : recentSales.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 600 }}>#{s.id.slice(0, 8)}</p>
                <p style={{ fontSize: '0.68rem', color: C.muted }}>
                  {s.item_count} item{s.item_count !== 1 ? 's' : ''} · {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: C.green }}>{KshsShort(s.total_amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's Hourly Sales ── */}
      {hourly.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>⏱ Today's Hourly Sales</h3>
          <HourlyChart data={hourly} chartHeight={90} />
        </div>
      )}

      {/* ── Alert Panels ── */}
      {(outProds.length > 0 || lowProds.length > 0 || deadStock.length > 0 || expiryAlerts.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>

          {outProds.length > 0 && (
            <div className="card" style={{ borderLeft: `3px solid ${C.danger}`, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <PackageX size={15} color={C.danger} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.danger }}>OUT OF STOCK ({outProds.length})</span>
              </div>
              {outProds.slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>{p.name}</span>
                  <button onClick={() => navigate('/stock')} style={{ color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Restock →</button>
                </div>
              ))}
            </div>
          )}

          {lowProds.length > 0 && (
            <div className="card" style={{ borderLeft: `3px solid ${C.warning}`, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertCircle size={15} color={C.warning} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.warning }}>LOW STOCK ({lowProds.length})</span>
              </div>
              {lowProds.slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>{p.name}</span>
                  <span style={{ color: C.warning, fontWeight: 700 }}>{p.stock_quantity} left</span>
                </div>
              ))}
            </div>
          )}

          {deadStock.length > 0 && (
            <div className="card" style={{ borderLeft: `3px solid ${C.orange}`, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Flame size={15} color={C.orange} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.orange }}>DEAD STOCK ({deadStock.length})</span>
              </div>
              {deadStock.slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{d.name}</span>
                  <span style={{ color: C.muted }}>{d.days_held}d held</span>
                </div>
              ))}
            </div>
          )}

          {expiryAlerts.length > 0 && (
            <div className="card" style={{ borderLeft: `3px solid ${C.purple}`, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Clock size={15} color={C.purple} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: C.purple }}>EXPIRY ALERTS ({expiryAlerts.length})</span>
              </div>
              {expiryAlerts.slice(0, 4).map((e, i) => {
                const col = e.days_left <= 0 ? C.danger : e.days_left <= 3 ? C.warning : C.purple;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{e.name}</span>
                    <span style={{ color: col, fontWeight: 700 }}>
                      {e.days_left <= 0 ? `${Math.abs(e.days_left)}d ago` : `${e.days_left}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
