import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/market?days=7|14|30|90|180|365
// Стратегический обзор рынка: прибыль/маржа по деталям, бренды/категории,
// ABC-анализ, неликвид, дефицит при спросе, возвраты. Admin-only.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 90;

    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // --- Параллельно тянем всё нужное (минимальные select'ы) ---
    const [periodItems, purchaseItems, autoparts, returnItems] = await Promise.all([
      prisma.orderItems.findMany({
        where: { order: { createdAt: { gte: from, lte: to } } },
        select: {
          article: true,
          description: true,
          quantity: true,
          item_final_price: true,
          order: { select: { id: true, createdAt: true } },
        },
      }),
      prisma.purchaseOrderItems.findMany({
        select: { article: true, quantity: true, purchase_price: true },
      }),
      prisma.autoparts.findMany({
        select: {
          article: true,
          description: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          warehouses: { select: { quantity: true } },
        },
      }),
      prisma.returnItems.findMany({
        where: { return_: { createdAt: { gte: from, lte: to } } },
        select: { article: true, quantity: true },
      }),
    ]);

    // --- Средняя закупочная цена по артикулу (взвешенная по количеству) ---
    const costAgg = new Map<string, { sum: number; qty: number }>();
    for (const p of purchaseItems) {
      const e = costAgg.get(p.article) ?? { sum: 0, qty: 0 };
      e.sum += p.purchase_price * p.quantity;
      e.qty += p.quantity;
      costAgg.set(p.article, e);
    }
    const avgCost = (article: string): number | null => {
      const e = costAgg.get(article);
      return e && e.qty > 0 ? e.sum / e.qty : null;
    };

    // --- Справочник по артикулу: бренд/категория/остаток ---
    interface PartMeta {
      description: string;
      brand: string;
      category: string;
      stock: number;
    }
    const meta = new Map<string, PartMeta>();
    for (const a of autoparts) {
      meta.set(a.article, {
        description: a.description,
        brand: a.brand?.name ?? '—',
        category: a.category?.name ?? '—',
        stock: a.warehouses.reduce((s, w) => s + w.quantity, 0),
      });
    }

    // --- Продажи по артикулу (период) ---
    interface SalesRow {
      article: string;
      description: string;
      brand: string;
      category: string;
      qty: number;
      revenue: number;
      orderIds: Set<string>;
    }
    const sales = new Map<string, SalesRow>();
    const orderIdSet = new Set<string>();
    for (const it of periodItems) {
      orderIdSet.add(it.order.id);
      const m = meta.get(it.article);
      const row =
        sales.get(it.article) ??
        ({
          article: it.article,
          description: m?.description ?? it.description,
          brand: m?.brand ?? '—',
          category: m?.category ?? '—',
          qty: 0,
          revenue: 0,
          orderIds: new Set<string>(),
        } as SalesRow);
      row.qty += it.quantity;
      row.revenue += it.quantity * it.item_final_price;
      row.orderIds.add(it.order.id);
      sales.set(it.article, row);
    }

    // --- Топ деталей с прибылью/маржой ---
    const topParts = [...sales.values()].map((r) => {
      const cost = avgCost(r.article);
      const totalCost = cost != null ? cost * r.qty : null;
      const profit = totalCost != null ? r.revenue - totalCost : null;
      const marginPct = profit != null && r.revenue > 0 ? (profit / r.revenue) * 100 : null;
      return {
        article: r.article,
        description: r.description,
        brand: r.brand,
        qty: r.qty,
        orders: r.orderIds.size,
        revenue: r.revenue,
        profit,
        marginPct,
      };
    });

    // --- Сводка ---
    const revenue = topParts.reduce((s, p) => s + p.revenue, 0);
    const unitsSold = topParts.reduce((s, p) => s + p.qty, 0);
    const withCost = topParts.filter((p) => p.profit != null);
    const estProfit = withCost.reduce((s, p) => s + (p.profit ?? 0), 0);
    const revenueWithCost = withCost.reduce((s, p) => s + p.revenue, 0);
    const marginPct = revenueWithCost > 0 ? (estProfit / revenueWithCost) * 100 : 0;
    const ordersCount = orderIdSet.size;
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

    // Стоимость склада по закупке + неликвид
    let inventoryValueCost = 0;
    const deadStock: { article: string; description: string; stock: number; valueCost: number }[] = [];
    for (const [article, m] of meta) {
      if (m.stock <= 0) continue;
      const cost = avgCost(article) ?? 0;
      const value = m.stock * cost;
      inventoryValueCost += value;
      if (!sales.has(article)) {
        deadStock.push({ article, description: m.description, stock: m.stock, valueCost: value });
      }
    }
    deadStock.sort((a, b) => b.valueCost - a.valueCost || b.stock - a.stock);
    const deadStockValue = deadStock.reduce((s, d) => s + d.valueCost, 0);
    const deadStockTop = deadStock.slice(0, 15);

    // Дефицит при спросе: продавалось за период, но текущий остаток <= 0
    const stockouts = [...sales.values()]
      .map((r) => ({
        article: r.article,
        description: r.description,
        soldQty: r.qty,
        stock: meta.get(r.article)?.stock ?? 0,
      }))
      .filter((r) => r.stock <= 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 15);

    // --- По брендам / категориям ---
    function groupBy(key: 'brand' | 'category') {
      const map = new Map<string, { name: string; revenue: number; profit: number; qty: number }>();
      for (const p of topParts) {
        const name = key === 'brand' ? p.brand : sales.get(p.article)!.category;
        const e = map.get(name) ?? { name, revenue: 0, profit: 0, qty: 0 };
        e.revenue += p.revenue;
        e.profit += p.profit ?? 0;
        e.qty += p.qty;
        map.set(name, e);
      }
      return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }
    const byBrand = groupBy('brand');
    const byCategory = groupBy('category');

    // --- ABC-анализ (Парето по выручке) ---
    const sortedByRevenue = [...topParts].sort((a, b) => b.revenue - a.revenue);
    const abc = {
      a: { count: 0, revenue: 0 },
      b: { count: 0, revenue: 0 },
      c: { count: 0, revenue: 0 },
    };
    let cum = 0;
    for (const p of sortedByRevenue) {
      const share = revenue > 0 ? cum / revenue : 0;
      const bucket = share < 0.8 ? 'a' : share < 0.95 ? 'b' : 'c';
      abc[bucket].count += 1;
      abc[bucket].revenue += p.revenue;
      cum += p.revenue;
    }

    // --- Возвраты по артикулу (период) ---
    const retMap = new Map<string, { qty: number; count: number }>();
    for (const r of returnItems) {
      const e = retMap.get(r.article) ?? { qty: 0, count: 0 };
      e.qty += r.quantity;
      e.count += 1;
      retMap.set(r.article, e);
    }
    const topReturned = [...retMap.entries()]
      .map(([article, v]) => ({
        article,
        description: meta.get(article)?.description ?? '',
        qty: v.qty,
        count: v.count,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // --- Тренд: выручка + прибыль по дням ---
    const trendMap = new Map<string, { revenue: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) trendMap.set(key, { revenue: 0, profit: 0 });
    }
    for (const it of periodItems) {
      const d = it.order.createdAt;
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = trendMap.get(key) ?? { revenue: 0, profit: 0 };
      const lineRevenue = it.quantity * it.item_final_price;
      const cost = avgCost(it.article);
      e.revenue += lineRevenue;
      if (cost != null) e.profit += lineRevenue - cost * it.quantity;
      trendMap.set(key, e);
    }
    const trend = [...trendMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => {
        const [ad, am] = a.date.split('.').map(Number);
        const [bd, bm] = b.date.split('.').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

    return NextResponse.json({
      period: { days, from, to },
      summary: {
        revenue,
        estProfit,
        marginPct,
        unitsSold,
        distinctArticles: sales.size,
        ordersCount,
        avgOrderValue,
        inventoryValueCost,
        deadStockValue,
        deadStockCount: deadStock.length,
        profitCoverage: revenue > 0 ? (revenueWithCost / revenue) * 100 : 0,
      },
      trend,
      topParts: topParts.slice(0, 200), // клиент сортирует/режет
      byBrand,
      byCategory,
      abc,
      deadStock: deadStockTop,
      stockouts,
      topReturned,
    });
  } catch (error) {
    console.error('Error generating market report:', error);
    return NextResponse.json({ error: 'Failed to generate market report' }, { status: 500 });
  }
}
