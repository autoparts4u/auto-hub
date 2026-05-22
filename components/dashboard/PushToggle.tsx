'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BellRing, BellOff, BellPlus } from 'lucide-react';

type State = 'loading' | 'unsupported' | 'denied' | 'unsubscribed' | 'subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  // Определяем стартовое состояние: поддержка, разрешение, есть ли подписка
  const refreshState = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'subscribed' : 'unsubscribed');
    } catch {
      setState('unsubscribed');
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const subscribe = async () => {
    setBusy(true);
    try {
      // 1) Разрешение
      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Разрешение на уведомления не получено');
        setState(permission === 'denied' ? 'denied' : 'unsubscribed');
        return;
      }

      // 2) Public VAPID key
      const keyRes = await fetch('/api/push/public-key');
      if (!keyRes.ok) {
        toast.error('Сервер не настроен (VAPID)');
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      // 3) SW + push subscription
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4) Сохраняем на сервере
      const subJson = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || 'Не удалось сохранить подписку');
        return;
      }

      toast.success('Уведомления включены');
      setState('subscribed');
    } catch (e) {
      console.error(e);
      toast.error('Не удалось подписаться на уведомления');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
      toast.success('Уведомления выключены');
      setState('unsubscribed');
    } catch (e) {
      console.error(e);
      toast.error('Не удалось отписаться');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return null;

  if (state === 'unsupported') {
    return (
      <Button variant="ghost" size="sm" disabled title="Браузер не поддерживает push">
        <BellOff className="size-4" />
      </Button>
    );
  }

  if (state === 'denied') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Уведомления заблокированы в настройках браузера"
      >
        <BellOff className="size-4 text-destructive" />
      </Button>
    );
  }

  if (state === 'subscribed') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={unsubscribe}
        disabled={busy}
        title="Push включён · нажми чтобы выключить"
      >
        <BellRing className="size-4 text-emerald-600" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={subscribe} disabled={busy} title="Включить push-уведомления">
      <BellPlus className="size-4" />
    </Button>
  );
}
