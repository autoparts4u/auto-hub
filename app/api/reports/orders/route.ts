import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/orders?days=7|14|30|90
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Fetch all orders in the period with related data
    const orders = await prisma.orders.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        client: true,
        orderStatus: true,
        orderItems: true,
      },
    });

    // --- Summary ---
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paidRevenue = orders.reduce((sum, o) => {
      const net = (o.totalAmount ?? 0) - o.discount;
      const paid = o.paidAmount;
      // fully paid orders contribute their net amount; others contribute their paidAmount
      return sum + Math.min(paid, net);
    }, 0);

    const debt = orders.reduce((sum, o) => {
      const net = (o.totalAmount ?? 0) - o.discount;
      const paid = o.paidAmount;
      if (paid < net) {
        return sum + (net - paid);
      }
      return sum;
    }, 0);

    // New clients: clients whose FIRST ever order falls within the period
    const clientIdsInPeriod = [...new Set(orders.map((o) => o.client_id))];

    let newClients = 0;
    if (clientIdsInPeriod.length > 0) {
      // For each client in the period, find their earliest order ever
      const firstOrders = await prisma.orders.groupBy({
        by: ['client_id'],
        where: {
          client_id: { in: clientIdsInPeriod },
        },
        _min: { createdAt: true },
      });

      newClients = firstOrders.filter((fo) => {
        const firstDate = fo._min.createdAt;
        return firstDate && firstDate >= from && firstDate <= to;
      }).length;
    }

    // --- By Status ---
    const statusMap = new Map<
      number,
      { statusId: number; statusName: string; hexColor: string; count: number; revenue: number }
    >();
    for (const o of orders) {
      const sid = o.orderStatus_id;
      if (!statusMap.has(sid)) {
        statusMap.set(sid, {
          statusId: sid,
          statusName: o.orderStatus.name,
          hexColor: o.orderStatus.hexColor,
          count: 0,
          revenue: 0,
        });
      }
      const entry = statusMap.get(sid)!;
      entry.count += 1;
      entry.revenue += o.totalAmount ?? 0;
    }
    const byStatus = [...statusMap.values()].sort((a, b) => b.count - a.count);

    // --- Trend: group by day ---
    const trendMap = new Map<string, { orders: number; revenue: number }>();

    // Fill all days with zeros first
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) {
        trendMap.set(key, { orders: 0, revenue: 0 });
      }
    }

    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) {
        trendMap.set(key, { orders: 0, revenue: 0 });
      }
      const entry = trendMap.get(key)!;
      entry.orders += 1;
      entry.revenue += o.totalAmount ?? 0;
    }

    const trend = [...trendMap.entries()]
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        // Sort by date DD.MM
        const [aDay, aMon] = a.date.split('.').map(Number);
        const [bDay, bMon] = b.date.split('.').map(Number);
        if (aMon !== bMon) return aMon - bMon;
        return aDay - bDay;
      });

    // --- Top Clients: top 10 by revenue ---
    const clientMap = new Map<
      string,
      { clientId: string; clientName: string; orderCount: number; revenue: number; paidAmount: number }
    >();
    for (const o of orders) {
      if (!clientMap.has(o.client_id)) {
        clientMap.set(o.client_id, {
          clientId: o.client_id,
          clientName: o.client.name,
          orderCount: 0,
          revenue: 0,
          paidAmount: 0,
        });
      }
      const entry = clientMap.get(o.client_id)!;
      entry.orderCount += 1;
      entry.revenue += o.totalAmount ?? 0;
      entry.paidAmount += o.paidAmount;
    }
    const topClients = [...clientMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Top Products: group orderItems by article, top 10 by totalQuantity ---
    const orderIds = orders.map((o) => o.id);
    let topProducts: {
      article: string;
      description: string;
      totalQuantity: number;
      totalRevenue: number;
    }[] = [];

    if (orderIds.length > 0) {
      const items = await prisma.orderItems.findMany({
        where: { order_id: { in: orderIds } },
      });

      const productMap = new Map<
        string,
        { article: string; description: string; totalQuantity: number; totalRevenue: number }
      >();
      for (const item of items) {
        if (!productMap.has(item.article)) {
          productMap.set(item.article, {
            article: item.article,
            description: item.description,
            totalQuantity: 0,
            totalRevenue: 0,
          });
        }
        const entry = productMap.get(item.article)!;
        entry.totalQuantity += item.quantity;
        entry.totalRevenue += item.quantity * item.item_final_price;
      }

      topProducts = [...productMap.values()]
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);
    }

    // --- Payment Breakdown ---
    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    for (const o of orders) {
      const net = (o.totalAmount ?? 0) - o.discount;
      const p = o.paidAmount;
      if (p === 0) {
        unpaid += 1;
      } else if (p >= net) {
        paid += 1;
      } else {
        partial += 1;
      }
    }

    return NextResponse.json({
      period: { days, from, to },
      summary: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        paidRevenue,
        debt,
        newClients,
      },
      byStatus,
      trend,
      topClients,
      topProducts,
      paymentBreakdown: { paid, partial, unpaid },
    });
  } catch (error) {
    console.error('Error generating orders report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
