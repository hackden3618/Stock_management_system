/**
 * Centralized API configuration and storage keys
 */
export const API_BASE_URL = 'http://127.0.0.1:8000/endpoints.php';

export const StorageKeys = {
  PRODUCTS: 'cached_products',
  LAST_SYNC: 'last_sync_time',
  USER: 'auth_user',
  CART: 'cart_items',
  SYNC_QUEUE: 'sync_queue'
};

export const StorageManager = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  },
  getQueue: () => StorageManager.get(StorageKeys.SYNC_QUEUE) || [],
  addToQueue: (action) => {
    const queue = StorageManager.getQueue();
    const item = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...action
    };
    queue.push(item);
    StorageManager.set(StorageKeys.SYNC_QUEUE, queue);
    window.dispatchEvent(new CustomEvent('queue-updated', { detail: queue.length }));
    return item;
  },
  clearQueueItem: (id) => {
    const queue = StorageManager.getQueue().filter(i => i.id !== id);
    StorageManager.set(StorageKeys.SYNC_QUEUE, queue);
    window.dispatchEvent(new CustomEvent('queue-updated', { detail: queue.length }));
  }
};
