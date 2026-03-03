import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    // In actual use, fetch from /api/auth.php
    // Since we're offshore-first, ensure network check or grace degradation is handled if needed
    
    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.message || 'Login failed.');
      setIsSubmitting(false);
    }
    // On success, AuthContext unblocks the router and shows the App 
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', padding: '40px 32px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
           <div style={{ display: 'inline-flex', background: 'var(--primary-teal)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
             <Zap size={32} color="white" />
           </div>
           <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Growth Engine Login</h1>
           <p style={{ color: 'var(--text-muted)' }}>Enter your credentials to access your store.</p>
        </div>

        {error && <div style={{ background: 'rgba(235, 87, 87, 0.1)', color: 'var(--status-danger)', padding: 12, borderRadius: 8, marginBottom: 24, textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, justifyContent: "center" }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, color: 'var(--text-main)', outline: 'none' }}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, color: 'var(--text-main)', outline: 'none' }}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: 16, fontSize: '1rem', marginTop: 12 }}>
            <LogIn size={18} /> {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
