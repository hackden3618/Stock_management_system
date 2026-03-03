// Simplified - no more queue. Just pings server and exposes online status.
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/storage';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}?action=ping`, { cache: 'no-store' });
        if (!cancelled) setIsOnline(r.ok);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    };

    ping();
    const interval = setInterval(ping, 30_000);
    window.addEventListener('online',  ping);
    window.addEventListener('offline', () => !cancelled && setIsOnline(false));

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isSyncing: false, queueLength: 0 };
}
