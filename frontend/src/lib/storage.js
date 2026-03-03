// Central API configuration
export const API_BASE_URL = 'http://127.0.0.1:8000/endpoints.php';

// Cart lives in localStorage (session state, not sync state)
export const CART_KEY = 'cart_items';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('storage'));
}

// Simple direct API helper
export async function api(action, body = null) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const res = await fetch(`${API_BASE_URL}?action=${action}`, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Legacy compat shim — keeps old imports from crashing during transition
export const StorageKeys = { PRODUCTS: 'cached_products', CART: 'cart_items' };
export const StorageManager = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
