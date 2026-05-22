// AutoHub service worker — обрабатывает push и клик по уведомлению.
// Намеренно минимальный: никакого precaching/offline, фокус только на push.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'AutoHub', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'AutoHub';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    requireInteraction: payload.requireInteraction !== false,
    data: { url: payload.url || '/dashboard', ...(payload.data || {}) },
    timestamp: payload.timestamp || Date.now(),
  };
  if (Array.isArray(payload.actions)) options.actions = payload.actions;
  if (payload.vibrate) options.vibrate = payload.vibrate;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытое окно AutoHub — фокусируем + навигируем
      for (const client of clientList) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return undefined;
          }
        } catch (e) {
          // ignore
        }
      }
      // иначе — открываем новое
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

// Браузер сообщает что подписка протухла — на проде можно слать запрос на /api/push/subscribe
// для resubscribe; пока просто игнорируем.
self.addEventListener('pushsubscriptionchange', () => {});
