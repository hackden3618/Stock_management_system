import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, Store, User, Lock, Mail, ArrowRight, Loader } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Field MUST live outside Login.
// If it were defined inside, React would treat it as a brand-new component type
// on every render (each keystroke), unmount + remount the <input>, and lose focus.
// ─────────────────────────────────────────────────────────────────────────────
function Field({ icon: Icon, type, placeholder, value, onChange, right }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon
        size={16}
        style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }}
      />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 42px', borderRadius: 10,
          border: '1px solid var(--border-light)', background: 'var(--bg-app)',
          color: 'var(--text-main)', fontSize: '0.92rem', outline: 'none',
          paddingRight: right ? 42 : 14,
        }}
      />
      {right}
    </div>
  );
}

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode]   = useState('login');

  const [loginData, setLoginData]   = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({
    username: '', email: '', password: '', confirm: '', shop_name: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginData.username || !loginData.password)
      return setError('Both fields are required.');
    setBusy(true);
    const res = await login(loginData.username, loginData.password);
    if (!res.success) setError(res.message);
    setBusy(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    const { username, email, password, confirm, shop_name } = signupData;
    if (!username || !password || !shop_name)
      return setError('Username, password and business name are required.');
    if (password.length < 6)
      return setError('Password must be at least 6 characters.');
    if (password !== confirm)
      return setError('Passwords do not match.');
    setBusy(true);
    const res = await signup(username, email, password, shop_name);
    if (!res.success) setError(res.message);
    setBusy(false);
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--primary-teal)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px',
          }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Growth Engine</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>
            {mode === 'login' ? 'Sign in to manage your shop' : 'Create your free shop account'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--bg-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
          border: '1px solid var(--border-light)',
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.88rem', transition: 'all 0.15s',
              background: mode === m ? 'var(--primary-teal)' : 'transparent',
              color: mode === m ? 'white' : 'var(--text-muted)',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 9, padding: '10px 14px',
              color: 'var(--status-danger)', fontSize: '0.85rem', marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field icon={User} type="text" placeholder="Username"
                value={loginData.username}
                onChange={v => setLoginData(p => ({ ...p, username: v }))} />
              <Field icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password"
                value={loginData.password}
                onChange={v => setLoginData(p => ({ ...p, password: v }))}
                right={
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <button type="submit" className="btn-primary" disabled={busy} style={{
                padding: '13px', fontSize: '0.95rem', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {busy ? <><Loader size={16} className="spin" /> Signing in…</> : <>Sign In <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* ── SIGNUP ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, display: 'block' }}>BUSINESS NAME *</label>
                <Field icon={Store} type="text" placeholder="e.g. Mama Njeri's Supermarket"
                  value={signupData.shop_name}
                  onChange={v => setSignupData(p => ({ ...p, shop_name: v }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, display: 'block' }}>USERNAME *</label>
                <Field icon={User} type="text" placeholder="Choose a username"
                  value={signupData.username}
                  onChange={v => setSignupData(p => ({ ...p, username: v }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, display: 'block' }}>EMAIL (optional)</label>
                <Field icon={Mail} type="email" placeholder="your@email.com"
                  value={signupData.email}
                  onChange={v => setSignupData(p => ({ ...p, email: v }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, display: 'block' }}>PASSWORD * (min 6 characters)</label>
                <Field icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Create a password"
                  value={signupData.password}
                  onChange={v => setSignupData(p => ({ ...p, password: v }))}
                  right={
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, display: 'block' }}>CONFIRM PASSWORD *</label>
                <Field icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Repeat password"
                  value={signupData.confirm}
                  onChange={v => setSignupData(p => ({ ...p, confirm: v }))} />
              </div>
              <button type="submit" className="btn-primary" disabled={busy} style={{
                padding: '13px', fontSize: '0.95rem', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {busy ? <><Loader size={16} className="spin" /> Creating account…</> : <>Create My Shop <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 20 }}>
          Each shop's data is completely separate and private.
        </p>
      </div>
    </div>
  );
}
