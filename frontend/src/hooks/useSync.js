import { useState, useCallback, useEffect } from 'react';
import { StorageManager, StorageKeys, API_BASE_URL } from '../lib/storage';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(StorageManager.getQueue().length);
  const [lastSyncTime, setLastSyncTime] = useState(StorageManager.get(StorageKeys.LAST_SYNC));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status with a ping
  useEffect(() => {
    const checkOnline = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}?action=ping`, { method: 'HEAD', cache: 'no-store' });
        setIsOnline(response.ok);
      } catch (e) {
        setIsOnline(false);
      }
    };

    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) checkOnline();
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const interval = setInterval(checkOnline, 30000); // Ping every 30s

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleQueueUpdate = (e) => setQueueLength(e.detail);
    window.addEventListener('queue-updated', handleQueueUpdate);
    return () => window.removeEventListener('queue-updated', handleQueueUpdate);
  }, []);

  const fetchLatestProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=getProducts`);
      console.log(response);
      if (response.ok) {
        const result = await response.json();
        StorageManager.set(StorageKeys.PRODUCTS, result.data || []);
        const now = new Date().toISOString();
        StorageManager.set(StorageKeys.LAST_SYNC, now);
        setLastSyncTime(now);
        window.dispatchEvent(new CustomEvent('products-updated'));
        return true;
      }
    } catch (e) {
      console.log('Could not fetch latest products. Using cached version if available.');
      return false;
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return false;
    
    setIsSyncing(true);
    let queue = StorageManager.getQueue();
    let syncSuccess = true;

    if (queue.length > 0) {
      for (const item of queue) {
        try {
          const response = await fetch(`${API_BASE_URL}?action=sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });

          if (response.ok) {
            StorageManager.clearQueueItem(item.id);
          } else {
            console.error('Failed to sync item:', item.id);
            syncSuccess = false;
            break; 
          }
        } catch (e) {
          console.error('Network error during sync:', e);
          syncSuccess = false;
          break; 
        }
      }
    }

    await fetchLatestProducts();
    
    setIsSyncing(false);
    return syncSuccess;
  }, [isSyncing, isOnline, fetchLatestProducts]);

  // Silent background sync effect
  useEffect(() => {
    if (isOnline && queueLength > 0 && !isSyncing) {
      syncQueue();
    }
  }, [isOnline, queueLength, isSyncing, syncQueue]);

  return {
    isSyncing,
    queueLength,
    lastSyncTime,
    isOnline,
    syncQueue,
    fetchLatestProducts
  };
}
