import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/product/[id]?days=7|14|30|90|180|365
// Аналитика по детали: продажи за период, кто покупает, остатки/брони, возвраты.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const part = await prisma.autoparts.findUnique({
      where: { id },
      select: {
        id: true,
        article: true,
        description: true,
        brand: { select: { name: true } },
        warehouses: {
          select: { quantity: true, warehouse: { select: { id: true, name: true } } },
        },
      },
    });
    if (!part) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Артикул — устойчивый бизнес-ключ: присутствует и в позициях заказа, и в возвратах,
    // даже если autopart_id обнулился (onDelete: SetNull).
    const article = part.article;

    // --- Продажи: позиции заказов по артикулу (с датой заказа и клиентом) ---
    const items = await prisma.orderItems.findMany({
      where: { article },
      select: {
        quantity: true,
        item_final_price: true,
        order: {
          select: {
            id: true,
            createdAt: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    const lifetimeSoldQty = items.reduce((s, it) => s + it.quantity, 0);

    const periodItems = items.filter(
      (it) => it.order.createdAt >= from && it.order.createdAt <= to
    );
    const soldQty = periodItems.reduce((s, it) => s + it.quantity, 0);
    const revenue = periodItems.reduce((s, it) => s + it.quantity * it.item_final_price, 0);
    const orderIds = new Set(periodItems.map((it) => it.order.id));
    const orderCount = orderIds.size;
    const avgPrice = soldQty > 0 ? revenue / soldQty : 0;

    // --- Тренд по дням ---
    const trendMap = new Map<string, { qty: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) trendMap.set(key, { qty: 0, revenue: 0 });
    }
    for (const it of periodItems) {
      const d = it.order.createdAt;
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = trendMap.get(key) ?? { qty: 0, revenue: 0 };
      e.qty += it.quantity;
      e.revenue += it.quantity * it.item_final_price;
      trendMap.set(key, e);
    }
    const trend = [...trendMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => {
        const [ad, am] = a.date.split('.').map(Number);
        const [bd, bm] = b.date.split('.').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

    // --- Кто покупает (период) ---
    const clientMap = new Map<
      string,
      { clientId: string; clientName: string; qty: number; revenue: number }
    >();
    for (const it of periodItems) {
      const c = it.order.client;
      const e = clientMap.get(c.id) ?? {
        clientId: c.id,
        clientName: c.name,
        qty: 0,
        revenue: 0,
      };
      e.qty += it.quantity;
      e.revenue += it.quantity * it.item_final_price;
      clientMap.set(c.id, e);
    }
    const topClients = [...clientMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

    // --- Остатки по складам (текущие) ---
    const stockByWarehouse = part.warehouses
      .map((w) => ({ warehouseName: w.warehouse.name, quantity: w.quantity }))
      .sort((a, b) => b.quantity - a.quantity);
    const totalStock = stockByWarehouse.reduce((s, w) => s + w.quantity, 0);

    // --- Активные брони (текущие) ---
    const activeReservations = await prisma.reservations.aggregate({
      where: { autopart_id: id, status: 'active' },
      _sum: { quantity: true },
      _count: true,
    });
    const activeReserved = activeReservations._sum.quantity ?? 0;
    const activeReservationCount = activeReservations._count;

    // --- Возвраты по артикулу (период) ---
    const returnItems = await prisma.returnItems.findMany({
      where: { article, return_: { createdAt: { gte: from, lte: to } } },
      select: { quantity: true, return_: { select: { reason: true } } },
    });
    const returnedQty = returnItems.reduce((s, r) => s + r.quantity, 0);
    const reasonMap = new Map<string, number>();
    for (const r of returnItems) {
      const reason = r.return_.reason?.trim() || 'Без причины';
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
    const returnReasons = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      product: {
        id: part.id,
        article: part.article,
        description: part.description,
        brand: part.brand?.name ?? null,
      },
      period: { days, from, to },
      summary: {
        soldQty,
        revenue,
        orderCount,
        avgPrice,
        totalStock,
        activeReserved,
        returnedQty,
        lifetimeSoldQty,
      },
      trend,
      topClients,
      stockByWarehouse,
      reservations: { qty: activeReserved, count: activeReservationCount },
      returns: { count: returnItems.length, qty: returnedQty, reasons: returnReasons },
    });
  } catch (error) {
    console.error('Error generating product report:', error);
    return NextResponse.json({ error: 'Failed to generate product report' }, { status: 500 });
  }
}
