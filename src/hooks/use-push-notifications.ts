import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

// VAPID public key — set in .env as VITE_VAPID_PUBLIC_KEY
// Generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>('loading');
  const registered = useRef(false);

  // Register service worker on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (registered.current) return;
    registered.current = true;

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setState('subscribed');
        } else {
          setState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
        }
      })
      .catch(() => setState('unsupported'));
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set — web push disabled');
      return false;
    }
    if (!user) return false;

    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store in push_tokens table (same table mobile uses)
      const subJson = sub.toJSON();
      await (supabase as any).from('push_tokens').upsert({
        user_id:  user.id,
        token:    subJson.endpoint,           // endpoint acts as token for web
        platform: 'web',
        p256dh:   subJson.keys?.p256dh ?? null,
        auth_key: subJson.keys?.auth ?? null,
      }, { onConflict: 'user_id,token' });

      setState('subscribed');
      return true;
    } catch {
      setState(Notification.permission === 'denied' ? 'denied' : 'unsubscribed');
      return false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        if (user) {
          await (supabase as any)
            .from('push_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('token', sub.endpoint);
        }
      }
    } catch { /* ignore */ }
    setState('unsubscribed');
  };

  return { state, subscribe, unsubscribe };
}
