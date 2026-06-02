import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/client/[clientId]?days=7|14|30|90|180|365
// Аналитика покупок конкретного клиента: lifetime-сводка + срез за период.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { clientId } = await params;
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, fullName: true, phone: true },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Все заказы клиента (для lifetime-метрик и долга), с позициями и статусом.
    const orders = await prisma.orders.findMany({
      where: { client_id: clientId },
      include: { orderStatus: true, orderItems: true },
      orderBy: { createdAt: 'asc' },
    });

    const net = (o: (typeof orders)[number]) => (o.totalAmount ?? 0) - o.discount;

    // --- Lifetime ---
    const lifetimeRevenue = orders.reduce((s, o) => s + net(o), 0);
    const debt = orders.reduce((s, o) => {
      const outstanding = net(o) - o.paidAmount;
      return outstanding > 0 ? s + outstanding : s;
    }, 0);
    const firstOrderAt = orders.length ? orders[0].createdAt : null;
    const lastOrderAt = orders.length ? orders[orders.length - 1].createdAt : null;

    // --- Период ---
    const periodOrders = orders.filter((o) => o.createdAt >= from && o.createdAt <= to);
    const revenue = periodOrders.reduce((s, o) => s + net(o), 0);
    const paidRevenue = periodOrders.reduce((s, o) => s + Math.min(o.paidAmount, net(o)), 0);
    const avgCheck = periodOrders.length ? revenue / periodOrders.length : 0;

    // --- Тренд по дням ---
    const trendMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) trendMap.set(key, { orders: 0, revenue: 0 });
    }
    for (const o of periodOrders) {
      const d = o.createdAt;
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = trendMap.get(key) ?? { orders: 0, revenue: 0 };
      e.orders += 1;
      e.revenue += net(o);
      trendMap.set(key, e);
    }
    const trend = [...trendMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => {
        const [ad, am] = a.date.split('.').map(Number);
        const [bd, bm] = b.date.split('.').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

    // --- Статусы (период) ---
    const statusMap = new Map<number, { statusName: string; hexColor: string; count: number }>();
    for (const o of periodOrders) {
      const e = statusMap.get(o.orderStatus_id) ?? {
        statusName: o.orderStatus.name,
        hexColor: o.orderStatus.hexColor,
        count: 0,
      };
      e.count += 1;
      statusMap.set(o.orderStatus_id, e);
    }
    const statusBreakdown = [...statusMap.values()].sort((a, b) => b.count - a.count);

    // --- Оплата (период) ---
    let paid = 0;
    let partial = 0;
    let unpaid = 0;
    for (const o of periodOrders) {
      const n = net(o);
      if (o.paidAmount <= 0) unpaid += 1;
      else if (o.paidAmount >= n) paid += 1;
      else partial += 1;
    }

    // --- Топ деталей клиента (период) ---
    const partMap = new Map<
      string,
      { article: string; description: string; quantity: number; revenue: number }
    >();
    for (const o of periodOrders) {
      for (const it of o.orderItems) {
        const e = partMap.get(it.article) ?? {
          article: it.article,
          description: it.description,
          quantity: 0,
          revenue: 0,
        };
        e.quantity += it.quantity;
        e.revenue += it.quantity * it.item_final_price;
        partMap.set(it.article, e);
      }
    }
    const topParts = [...partMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // --- Последние заказы (период, до 10) ---
    const recentOrders = [...periodOrders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((o) => {
        const n = net(o);
        return {
          id: o.id,
          createdAt: o.createdAt,
          statusName: o.orderStatus.name,
          hexColor: o.orderStatus.hexColor,
          net: n,
          paid: o.paidAmount,
          debt: Math.max(0, n - o.paidAmount),
        };
      });

    return NextResponse.json({
      client,
      period: { days, from, to },
      summary: {
        totalOrders: periodOrders.length,
        revenue,
        paidRevenue,
        debt,
        avgCheck,
        lifetimeOrders: orders.length,
        lifetimeRevenue,
        firstOrderAt,
        lastOrderAt,
      },
      trend,
      statusBreakdown,
      paymentBreakdown: { paid, partial, unpaid },
      topParts,
      recentOrders,
    });
  } catch (error) {
    console.error('Error generating client report:', error);
    return NextResponse.json({ error: 'Failed to generate client report' }, { status: 500 });
  }
}
