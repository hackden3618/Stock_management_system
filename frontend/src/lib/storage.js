export const API_BASE_URL  = 'http://127.0.0.1:8000/endpoints.php';
export const AUTH_BASE_URL = 'http://127.0.0.1:8000/auth.php';

// ── Auth token ────────────────────────────────────────────────────
export function getToken()       { return localStorage.getItem('auth_token') || ''; }
export function setToken(t)      { localStorage.setItem('auth_token', t); }
export function clearToken()     { localStorage.removeItem('auth_token'); }

// ── Authed fetch helper ───────────────────────────────────────────
// extraParams: optional string appended to URL, e.g. 'days=14&foo=bar'
export async function apiFetch(action, body = null, extraParams = '') {
  const url = `${API_BASE_URL}?action=${action}${extraParams ? '&' + extraParams : ''}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
  const opts = body
    ? { method: 'POST', headers, body: JSON.stringify(body) }
    : { method: 'GET',  headers };
  const res = await fetch(url, opts);
  if (!res.ok && res.status === 401) {
    // Token expired or invalid — wipe session and return to login screen
    clearToken();
    localStorage.removeItem('auth_user');
    window.location.reload();
    return;
  }
  return res.json();
}

// ── Cart (session-local only) ─────────────────────────────────────
export const CART_KEY = 'cart_items';
export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('storage'));
}

// Legacy shim so old imports don't break
export const StorageKeys = { PRODUCTS: 'cached_products', CART: 'cart_items' };
export const StorageManager = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
