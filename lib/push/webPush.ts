import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';
import prisma from '@/lib/db/db';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@autohub.local';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

/**
 * Шлёт push на одну подписку. Если endpoint протух (404/410) — удаляет из БД.
 * Возвращает true если доставлено успешно.
 */
export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  ensureConfigured();

  const subscription: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Подписка протухла — удаляем
      await prisma.pushSubscription
        .deleteMany({ where: { endpoint: sub.endpoint } })
        .catch(() => {});
    } else {
      console.error('Push send error:', err);
    }
    return false;
  }
}

/**
 * Шлёт push на все подписки конкретного пользователя.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return 0;
  const results = await Promise.all(subs.map((s) => sendPushToSubscription(s, payload)));
  return results.filter(Boolean).length;
}
