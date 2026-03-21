import db from "@/lib/db/db";

// Окно активности: если последний heartbeat был меньше 4 минут назад — сессия считается активной
const SESSION_ACTIVE_WINDOW_MS = 4 * 60 * 1000;

async function getGeoByIp(ip: string): Promise<{ country: string | null; city: string | null }> {
  // Локальные и приватные IP — геолокация не нужна
  if (!ip || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    if (process.env.NODE_ENV === "development") {
      console.log("[activity] skipping geo for local IP:", ip);
    }
    return { country: null, city: null };
  }
  if (process.env.NODE_ENV === "development") {
    console.log("[activity] fetching geo for IP:", ip);
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    if (data.status === "success") {
      return { country: data.country ?? null, city: data.city ?? null };
    }
  } catch {
    // Геолокация не критична — молча игнорируем ошибку
  }
  return { country: null, city: null };
}

/**
 * Возвращает ID активной сессии для пользователя или создаёт новую.
 * Вызывается из серверных layout-компонентов при каждом рендере страницы.
 */
export async function getOrCreateActivitySession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const cutoff = new Date(Date.now() - SESSION_ACTIVE_WINDOW_MS);

  const existing = await db.userActivitySession.findFirst({
    where: {
      userId,
      OR: [
        // Сессия ещё не закрыта и была создана недавно
        { endedAt: null, startedAt: { gte: cutoff } },
        // Был недавний heartbeat (endedAt обновляется на каждом пинге)
        { endedAt: { gte: cutoff } },
      ],
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const { country, city } = ipAddress ? await getGeoByIp(ipAddress) : { country: null, city: null };

  const session = await db.userActivitySession.create({
    data: { userId, userAgent, ipAddress, country, city },
    select: { id: true },
  });

  return session.id;
}

/**
 * Обновляет время последней активности сессии (вызывается heartbeat-ом с клиента).
 */
export async function touchSession(sessionId: string, userId: string): Promise<void> {
  // Проверяем владельца перед обновлением
  await db.userActivitySession.updateMany({
    where: { id: sessionId, userId },
    data: { endedAt: new Date() },
  });
}

/**
 * Явно закрывает последнюю открытую сессию пользователя (при sign-out).
 */
export async function finalizeSession(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - SESSION_ACTIVE_WINDOW_MS);

  // Ищем активную сессию: либо не закрытую, либо с недавним heartbeat
  const session = await db.userActivitySession.findFirst({
    where: {
      userId,
      OR: [
        { endedAt: null },
        { endedAt: { gte: cutoff } },
      ],
    },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  if (session) {
    await db.userActivitySession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });
  }
}

/**
 * Записывает событие активности (fire-and-forget с клиента через API).
 */
export async function logActivity(
  sessionId: string,
  userId: string,
  type: string,
  payload?: object
): Promise<void> {
  // Проверяем что сессия принадлежит этому пользователю
  const session = await db.userActivitySession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });

  if (!session) return;

  await db.userActivityEvent.create({
    data: {
      sessionId,
      type,
      payload: payload ?? undefined,
    },
  });
}
