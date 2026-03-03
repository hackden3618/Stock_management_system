import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Save, LogOut, Shield } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // In production: PUT /api/users/{id} with auth token
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>⚙️ Account Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage your profile and security settings.</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {form.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{form.username}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Shield size={14} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 500 }}>{user?.role || 'Admin'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Username</label>
              <input
                name="username" value={form.username} onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Display Name</label>
              <input
                name="displayName" value={form.displayName} onChange={handleChange}
                placeholder="e.g. Thomas Wanjiku"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Email Address</label>
              <input
                name="email" value={form.email} onChange={handleChange} type="email"
                placeholder="your@email.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          </div>

          <h4 style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Change Password</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Current Password</label>
              <input
                name="currentPassword" value={form.currentPassword} onChange={handleChange} type="password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>New Password</label>
              <input
                name="newPassword" value={form.newPassword} onChange={handleChange} type="password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
              <Save size={16} /> Save Changes
            </button>
            {saved && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--status-success)', fontSize: '0.9rem', gap: 6 }}>✓ Saved!</span>}
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <h4 style={{ color: 'var(--status-danger)', marginBottom: 12 }}>Danger Zone</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>Log out from this session. You will need to log back in to access your store.</p>
        <button onClick={logout} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--status-danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: '0.9rem' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
