import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AUTH_BASE_URL, getToken } from '../lib/storage';
import { User, Save, LogOut, Shield, Store, Loader } from 'lucide-react';

export default function Settings() {
  const { user, logout, updateShopName } = useAuth();

  const [profileForm, setProfileForm] = useState({
    email:           user?.email           || '',
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [shopName,    setShopName]    = useState(user?.shop_name || '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [shopBusy,    setShopBusy]    = useState(false);
  const [profileMsg,  setProfileMsg]  = useState(null); // { type:'success'|'error', text }
  const [shopMsg,     setShopMsg]     = useState(null);

  // ── Save profile / password ──────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    const { email, currentPassword, newPassword, confirmPassword } = profileForm;

    if (newPassword && newPassword.length < 6)
      return setProfileMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
    if (newPassword && newPassword !== confirmPassword)
      return setProfileMsg({ type: 'error', text: 'Passwords do not match.' });
    if (newPassword && !currentPassword)
      return setProfileMsg({ type: 'error', text: 'Enter your current password to set a new one.' });

    setProfileBusy(true);
    try {
      const body = { email };
      if (newPassword) { body.current_password = currentPassword; body.new_password = newPassword; }

      const res  = await fetch(`${AUTH_BASE_URL}?action=updateProfile`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setProfileMsg({ type: 'success', text: 'Profile updated!' });
        setProfileForm(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Update failed.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Cannot reach server.' });
    }
    setProfileBusy(false);
  };

  // ── Save shop name ───────────────────────────────────────────────────
  const handleShopSave = async (e) => {
    e.preventDefault();
    setShopMsg(null);
    if (!shopName.trim()) return setShopMsg({ type: 'error', text: 'Shop name cannot be empty.' });
    setShopBusy(true);
    const res = await updateShopName(shopName.trim());
    setShopMsg(res.success
      ? { type: 'success', text: 'Shop name updated!' }
      : { type: 'error',   text: res.message || 'Update failed.' }
    );
    setShopBusy(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border-light)', background: 'var(--bg-app)',
    color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem',
  };

  const Msg = ({ msg }) => msg ? (
    <div style={{
      padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem', marginTop: 12,
      background: msg.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.08)',
      color:      msg.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
      border:     `1px solid ${msg.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.25)'}`,
    }}>
      {msg.text}
    </div>
  ) : null;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>⚙️ Account Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage your profile and security settings.</p>
      </div>

      {/* ── Identity card ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user?.username}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Shield size={14} color="var(--accent-blue)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSave}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Email Address
            </label>
            <input
              type="email" placeholder="your@email.com"
              value={profileForm.email}
              onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <h4 style={{
            marginBottom: 16, paddingTop: 16,
            borderTop: '1px solid var(--border-light)',
            color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Change Password
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Current Password</label>
              <input type="password" placeholder="Required to change password"
                value={profileForm.currentPassword}
                onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>New Password</label>
              <input type="password" placeholder="Min 6 characters"
                value={profileForm.newPassword}
                onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))}
                style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Confirm New Password</label>
              <input type="password" placeholder="Repeat new password"
                value={profileForm.confirmPassword}
                onChange={e => setProfileForm(p => ({ ...p, confirmPassword: e.target.value }))}
                style={inputStyle} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={profileBusy}
            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {profileBusy ? <><Loader size={15} className="spin" /> Saving…</> : <><Save size={15} /> Save Profile</>}
          </button>
          <Msg msg={profileMsg} />
        </form>
      </div>

      {/* ── Shop name ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Store size={16} /> Shop Name
        </h4>
        <form onSubmit={handleShopSave}>
          <input
            type="text" placeholder="Your shop name"
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <button type="submit" className="btn-primary" disabled={shopBusy}
            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {shopBusy ? <><Loader size={15} className="spin" /> Saving…</> : <><Save size={15} /> Update Shop Name</>}
          </button>
          <Msg msg={shopMsg} />
        </form>
      </div>

      {/* ── Danger Zone ── */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <h4 style={{ color: 'var(--status-danger)', marginBottom: 12 }}>Danger Zone</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Log out from this session. You will need to log back in to access your store.
        </p>
        <button onClick={logout} style={{
          background: 'rgba(239,68,68,0.1)', color: 'var(--status-danger)',
          border: '1px solid rgba(239,68,68,0.2)', padding: '10px 20px', borderRadius: 8,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 500, fontSize: '0.9rem',
        }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
