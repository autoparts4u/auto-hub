import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/db';
import { getDashboardTasks } from '@/lib/services/dashboardTasks';
import { sendPushToSubscription, type PushPayload } from '@/lib/push/webPush';

// Crontab вызывает раз в 5 минут. См. .github/workflows/dashboard-push.yml.
// Аутентификация — общий секрет в заголовке Authorization: Bearer <CRON_SECRET>.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APP_PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || '';

type Kind = 'handoverOverdue' | 'handoverToday' | 'purchaseOverdue' | 'reservationExpiring';

interface PushTarget {
  entityType: 'order' | 'purchase' | 'reservation';
  entityId: string;
  kind: Kind;
  payload: PushPayload;
}

function pluralizeShown(text: string) {
  // безопасное обрезание (web-push payload limit ~4kb, но тулбары мобильных режут заголовок)
  return text.length > 120 ? text.slice(0, 117) + '…' : text;
}

function dateOnly(d: Date | string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function timeOnly(d: Date | string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function dashboardUrl() {
  return APP_PUBLIC_URL ? `${APP_PUBLIC_URL.replace(/\/$/, '')}/dashboard` : '/dashboard';
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const tokenFromQuery = request.nextUrl.searchParams.get('secret') ?? '';
  if (tokenFromHeader !== cronSecret && tokenFromQuery !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await getDashboardTasks();

    // — Собираем список (entityType, entityId, kind, payload) к рассылке
    const targets: PushTarget[] = [];

    for (const o of tasks.handoverOverdue) {
      const clientName = o.client?.name || o.client?.fullName || 'клиент не указан';
      targets.push({
        entityType: 'order',
        entityId: o.id,
        kind: 'handoverOverdue',
        payload: {
          title: '🚨 Просрочена выдача',
          body: pluralizeShown(
            `${clientName} · заказ #${o.id.slice(-6)} (был на ${dateOnly(o.scheduledHandoverAt)})`
          ),
          url: dashboardUrl(),
          tag: `order:${o.id}`,
          requireInteraction: true,
        },
      });
    }

    for (const o of tasks.handoverToday) {
      const clientName = o.client?.name || o.client?.fullName || 'клиент не указан';
      targets.push({
        entityType: 'order',
        entityId: o.id,
        kind: 'handoverToday',
        payload: {
          title: '📦 Сегодня к выдаче',
          body: pluralizeShown(
            `${clientName} в ${timeOnly(o.scheduledHandoverAt)} · #${o.id.slice(-6)}`
          ),
          url: dashboardUrl(),
          tag: `order:${o.id}`,
        },
      });
    }

    for (const p of tasks.purchasesOverdue) {
      targets.push({
        entityType: 'purchase',
        entityId: p.id,
        kind: 'purchaseOverdue',
        payload: {
          title: '🚚 Поставка просрочена',
          body: pluralizeShown(
            `${p.supplier?.name ?? 'поставщик'} · ожидалось ${dateOnly(p.expectedAt)}`
          ),
          url: dashboardUrl(),
          tag: `purchase:${p.id}`,
          requireInteraction: true,
        },
      });
    }

    for (const r of tasks.reservationsExpiringSoon) {
      targets.push({
        entityType: 'reservation',
        entityId: r.id,
        kind: 'reservationExpiring',
        payload: {
          title: '⏰ Резервация скоро истечёт',
          body: pluralizeShown(
            `${r.autopart?.article ?? ''} · ${r.client?.name ?? ''} · до ${timeOnly(r.expiresAt)}`
          ),
          url: dashboardUrl(),
          tag: `reservation:${r.id}`,
        },
      });
    }

    if (targets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, targets: 0 });
    }

    // — Тянем все подписки активных админов
    const subs = await prisma.pushSubscription.findMany({
      where: { user: { role: 'admin' } },
      select: { id: true, endpoint: true, p256dh: true, auth: true, userId: true },
    });
    if (subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, targets: targets.length, subscribers: 0 });
    }

    // — Тянем за раз все недавние логи доставок (за 24 часа) для targets,
    //   чтобы избежать N-запросов в БД
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await prisma.pushDeliveryLog.findMany({
      where: {
        sentAt: { gte: since },
        OR: targets.map((t) => ({ entityType: t.entityType, entityId: t.entityId, kind: t.kind })),
      },
      select: { entityType: true, entityId: true, kind: true, userId: true },
    });
    const alreadyDeliveredKey = (entityType: string, entityId: string, kind: string, userId: string) =>
      `${entityType}:${entityId}:${kind}:${userId}`;
    const alreadyDelivered = new Set(
      recentLogs.map((l) => alreadyDeliveredKey(l.entityType, l.entityId, l.kind, l.userId))
    );

    let sent = 0;
    let skipped = 0;

    // — Шлём + логируем (последовательно по target, параллельно по подпискам одного user)
    for (const t of targets) {
      const userSubs = new Map<string, typeof subs>();
      for (const s of subs) {
        const arr = userSubs.get(s.userId) ?? [];
        arr.push(s);
        userSubs.set(s.userId, arr);
      }

      for (const [userId, userSubscriptions] of userSubs) {
        const key = alreadyDeliveredKey(t.entityType, t.entityId, t.kind, userId);
        if (alreadyDelivered.has(key)) {
          skipped++;
          continue;
        }

        const results = await Promise.all(
          userSubscriptions.map((s) => sendPushToSubscription(s, t.payload))
        );
        const delivered = results.some(Boolean);

        if (delivered) {
          sent++;
          alreadyDelivered.add(key); // в этом же запуске больше не слать
          await prisma.pushDeliveryLog
            .upsert({
              where: {
                entityType_entityId_kind_userId: {
                  entityType: t.entityType,
                  entityId: t.entityId,
                  kind: t.kind,
                  userId,
                },
              },
              create: {
                entityType: t.entityType,
                entityId: t.entityId,
                kind: t.kind,
                userId,
              },
              update: { sentAt: new Date() },
            })
            .catch((e) => console.error('Failed to log delivery:', e));
        }
      }
    }

    // — Уборка логов старше 7 дней (не блокирующая)
    prisma.pushDeliveryLog
      .deleteMany({ where: { sentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      targets: targets.length,
      subscribers: subs.length,
      sent,
      skipped,
    });
  } catch (error) {
    console.error('Cron dashboard-push failed:', error);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}
