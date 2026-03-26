import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/activity?days=7|14|30|90|180|365
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sessions = await prisma.userActivitySession.findMany({
      where: { startedAt: { gte: from, lte: to } },
      include: { events: true, user: { select: { id: true, email: true } } },
    });

    const allEvents = sessions.flatMap((s) => s.events);

    // --- Summary ---
    const totalSessions = sessions.length;
    const activeUsers = new Set(sessions.map((s) => s.userId)).size;
    const totalEvents = allEvents.length;

    const durations = sessions
      .filter((s) => s.endedAt)
      .map((s) => new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime());
    const avgDurationMin = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
      : 0;

    // --- Events by type ---
    const pageViews = allEvents.filter((e) => e.type === 'page_view').length;
    const searches = allEvents.filter((e) => e.type === 'search').length;
    const filters = allEvents.filter((e) => e.type === 'filter').length;
    const cartAdds = allEvents.filter((e) => e.type === 'cart_add').length;
    const cartRemoves = allEvents.filter((e) => e.type === 'cart_remove').length;
    const cartCheckouts = allEvents.filter((e) => e.type === 'cart_checkout').length;
    const modalOpens = allEvents.filter((e) => e.type === 'modal_open').length;

    // --- Trend by day ---
    const trendMap = new Map<string, { sessions: number; events: number; users: Set<string> }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendMap.set(key, { sessions: 0, events: 0, users: new Set() });
    }
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (trendMap.has(key)) {
        const entry = trendMap.get(key)!;
        entry.sessions += 1;
        entry.events += s.events.length;
        entry.users.add(s.userId);
      }
    }
    const trend = [...trendMap.entries()]
      .map(([date, d]) => ({ date, sessions: d.sessions, events: d.events, users: d.users.size }))
      .sort((a, b) => {
        const [aDay, aMon] = a.date.split('.').map(Number);
        const [bDay, bMon] = b.date.split('.').map(Number);
        return aMon !== bMon ? aMon - bMon : aDay - bDay;
      });

    // --- Top searches ---
    const searchMap = new Map<string, number>();
    for (const e of allEvents.filter((e) => e.type === 'search')) {
      const p = e.payload as Record<string, unknown> | null;
      const q = p && typeof p === 'object' ? String(p.query ?? '') : '';
      if (q) searchMap.set(q, (searchMap.get(q) ?? 0) + 1);
    }
    const topSearches = [...searchMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // --- Top pages ---
    const pageMap = new Map<string, number>();
    for (const e of allEvents.filter((e) => e.type === 'page_view')) {
      const p = e.payload as Record<string, unknown> | null;
      const path = p && typeof p === 'object' ? String(p.path ?? '') : '';
      if (path) pageMap.set(path, (pageMap.get(path) ?? 0) + 1);
    }
    const topPages = [...pageMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // --- Top cart items (most added to cart) ---
    const cartItemMap = new Map<string, { article: string; description: string; count: number }>();
    for (const e of allEvents.filter((e) => e.type === 'cart_add')) {
      const p = e.payload as Record<string, unknown> | null;
      if (!p || typeof p !== 'object') continue;
      const article = String(p.article ?? '');
      const description = String(p.description ?? '');
      if (!article) continue;
      if (!cartItemMap.has(article)) {
        cartItemMap.set(article, { article, description, count: 0 });
      }
      cartItemMap.get(article)!.count += 1;
    }
    const topCartItems = [...cartItemMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Modal opens breakdown ---
    const modalMap = new Map<string, number>();
    for (const e of allEvents.filter((e) => e.type === 'modal_open')) {
      const p = e.payload as Record<string, unknown> | null;
      const modal = p && typeof p === 'object' ? String(p.modal ?? '') : '';
      if (modal) modalMap.set(modal, (modalMap.get(modal) ?? 0) + 1);
    }
    const modalBreakdown = [...modalMap.entries()]
      .map(([modal, count]) => ({ modal, count }))
      .sort((a, b) => b.count - a.count);

    // --- Popular filters ---
    const FILTER_TYPE_LABELS: Record<string, string> = {
      brand: 'Бренд',
      category: 'Категория',
      auto: 'Автомобиль',
      warehouse: 'Склад',
      textForSearch: 'Метка',
      onlyInStock: 'Только в наличии',
    };
    // Usage count per filter type
    const filterTypeMap = new Map<string, number>();
    // Top values per filter type (only for array-valued filters)
    const filterValueMap = new Map<string, Map<string, number>>();

    for (const e of allEvents.filter((e) => e.type === 'filter')) {
      const p = e.payload as Record<string, unknown> | null;
      if (!p || typeof p !== 'object') continue;
      const ftype = String(p.type ?? '');
      if (!ftype) continue;

      filterTypeMap.set(ftype, (filterTypeMap.get(ftype) ?? 0) + 1);

      if (Array.isArray(p.values)) {
        if (!filterValueMap.has(ftype)) filterValueMap.set(ftype, new Map());
        const vmap = filterValueMap.get(ftype)!;
        for (const v of p.values as string[]) {
          if (v) vmap.set(v, (vmap.get(v) ?? 0) + 1);
        }
      }
    }

    const filterTypeUsage = [...filterTypeMap.entries()]
      .map(([type, count]) => ({ type, label: FILTER_TYPE_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count);

    const topFilterValues = [...filterValueMap.entries()].map(([type, vmap]) => ({
      type,
      label: FILTER_TYPE_LABELS[type] ?? type,
      values: [...vmap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count })),
    }));

    // --- Top active users ---
    const userMap = new Map<string, { email: string; sessions: number; events: number; cartAdds: number; checkouts: number }>();
    for (const s of sessions) {
      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, { email: s.user.email, sessions: 0, events: 0, cartAdds: 0, checkouts: 0 });
      }
      const entry = userMap.get(s.userId)!;
      entry.sessions += 1;
      entry.events += s.events.length;
      entry.cartAdds += s.events.filter((e) => e.type === 'cart_add').length;
      entry.checkouts += s.events.filter((e) => e.type === 'cart_checkout').length;
    }
    const topUsers = [...userMap.values()]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    return NextResponse.json({
      period: { days, from, to },
      summary: { totalSessions, activeUsers, totalEvents, avgDurationMin },
      eventBreakdown: { pageViews, searches, filters, cartAdds, cartRemoves, cartCheckouts, modalOpens },
      trend,
      topSearches,
      topPages,
      topCartItems,
      modalBreakdown,
      filterTypeUsage,
      topFilterValues,
      topUsers,
    });
  } catch (error) {
    console.error('Error generating activity report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
