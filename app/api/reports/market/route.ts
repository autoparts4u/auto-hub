import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reports/market?days=7|14|30|90|180|365
// Стратегический обзор рынка: прибыль/маржа по деталям, бренды/категории,
// ABC-анализ, неликвид, дефицит при спросе, возвраты. Admin-only.
//
// Себестоимость продаж считается по FIFO: каждая проданная штука списывается
// с самой старой ещё не распроданной партии закупки. Чтобы знать, какие партии
// уже «съедены» к началу периода, проигрываем всю историю продаж артикула,
// а в прибыль попадают только продажи внутри выбранного периода.
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
        select: { article: true, description: true },
      }),
      prisma.purchaseOrderItems.findMany({
        select: {
          article: true,
          quantity: true,
          purchase_price: true,
          purchaseOrder: { select: { orderedAt: true, receivedAt: true } },
        },
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

    // Артикулы, продававшиеся в периоде — только по ним нужна полная история для FIFO.
    const periodArticles = [...new Set(periodItems.map((i) => i.article))];
    const periodDesc = new Map<string, string>();
    for (const i of periodItems) if (!periodDesc.has(i.article)) periodDesc.set(i.article, i.description);

    // Вся история продаж этих артикулов (для проигрывания FIFO).
    const historyItems =
      periodArticles.length > 0
        ? await prisma.orderItems.findMany({
            where: { article: { in: periodArticles } },
            select: {
              article: true,
              quantity: true,
              item_final_price: true,
              order: { select: { id: true, createdAt: true } },
            },
          })
        : [];

    // --- Партии закупки по артикулу (по возрастанию даты прихода) ---
    const lotsByArticle = new Map<string, { qty: number; price: number; t: number }[]>();
    for (const p of purchaseItems) {
      const d = p.purchaseOrder.receivedAt ?? p.purchaseOrder.orderedAt;
      const lot = { qty: p.quantity, price: p.purchase_price, t: new Date(d).getTime() };
      const arr = lotsByArticle.get(p.article);
      if (arr) arr.push(lot);
      else lotsByArticle.set(p.article, [lot]);
    }
    for (const arr of lotsByArticle.values()) arr.sort((a, b) => a.t - b.t);

    // Текущий склад оцениваем по последней закупочной цене (остаток — это новые партии).
    const latestCost = (article: string): number | null => {
      const arr = lotsByArticle.get(article);
      return arr && arr.length ? arr[arr.length - 1].price : null;
    };

    // --- Все продажи по артикулу (по возрастанию даты) ---
    const allSalesByArticle = new Map<
      string,
      { qty: number; price: number; t: number; orderId: string; inPeriod: boolean }[]
    >();
    for (const it of historyItems) {
      const created = it.order.createdAt;
      const rec = {
        qty: it.quantity,
        price: it.item_final_price,
        t: new Date(created).getTime(),
        orderId: it.order.id,
        inPeriod: created >= from && created <= to,
      };
      const arr = allSalesByArticle.get(it.article);
      if (arr) arr.push(rec);
      else allSalesByArticle.set(it.article, [rec]);
    }
    for (const arr of allSalesByArticle.values()) arr.sort((a, b) => a.t - b.t);

    // --- FIFO-проигрывание: для продаж периода получаем себестоимость ---
    interface PeriodLine {
      article: string;
      t: number;
      qty: number;
      coveredQty: number; // штуки, для которых нашлась закупочная партия
      revenue: number;
      revenueCovered: number;
      cost: number;
      orderId: string;
    }
    const periodLines: PeriodLine[] = [];

    for (const [article, salesArr] of allSalesByArticle) {
      const lots = lotsByArticle.get(article) ?? [];
      let li = 0;
      let rem = lots[0]?.qty ?? 0;
      for (const s of salesArr) {
        let need = s.qty;
        let cost = 0;
        let covered = 0;
        while (need > 0 && li < lots.length) {
          const take = Math.min(need, rem);
          cost += take * lots[li].price;
          covered += take;
          need -= take;
          rem -= take;
          if (rem === 0) {
            li++;
            rem = lots[li]?.qty ?? 0;
          }
        }
        if (s.inPeriod) {
          periodLines.push({
            article,
            t: s.t,
            qty: s.qty,
            coveredQty: covered,
            revenue: s.qty * s.price,
            revenueCovered: covered * s.price,
            cost,
            orderId: s.orderId,
          });
        }
      }
    }

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

    // --- Агрегация продаж периода по артикулу ---
    interface SalesRow {
      article: string;
      description: string;
      brand: string;
      category: string;
      qty: number;
      revenue: number;
      revenueCovered: number;
      cost: number;
      coveredQty: number;
      orderIds: Set<string>;
    }
    const sales = new Map<string, SalesRow>();
    const orderIdSet = new Set<string>();
    for (const ln of periodLines) {
      orderIdSet.add(ln.orderId);
      const m = meta.get(ln.article);
      const row =
        sales.get(ln.article) ??
        ({
          article: ln.article,
          description: m?.description ?? periodDesc.get(ln.article) ?? '',
          brand: m?.brand ?? '—',
          category: m?.category ?? '—',
          qty: 0,
          revenue: 0,
          revenueCovered: 0,
          cost: 0,
          coveredQty: 0,
          orderIds: new Set<string>(),
        } as SalesRow);
      row.qty += ln.qty;
      row.revenue += ln.revenue;
      row.revenueCovered += ln.revenueCovered;
      row.cost += ln.cost;
      row.coveredQty += ln.coveredQty;
      row.orderIds.add(ln.orderId);
      sales.set(ln.article, row);
    }

    // --- Топ деталей с прибылью/маржой (FIFO) ---
    const topParts = [...sales.values()].map((r) => {
      const hasCost = r.coveredQty > 0;
      const profit = hasCost ? r.revenueCovered - r.cost : null;
      const marginPct =
        hasCost && r.revenueCovered > 0 ? ((profit as number) / r.revenueCovered) * 100 : null;
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
    let revenue = 0;
    let unitsSold = 0;
    let estProfit = 0;
    let revenueWithCost = 0;
    for (const r of sales.values()) {
      revenue += r.revenue;
      unitsSold += r.qty;
      if (r.coveredQty > 0) {
        estProfit += r.revenueCovered - r.cost;
        revenueWithCost += r.revenueCovered;
      }
    }
    const marginPct = revenueWithCost > 0 ? (estProfit / revenueWithCost) * 100 : 0;
    const ordersCount = orderIdSet.size;
    const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0;

    // Стоимость склада по последней закупке + неликвид
    let inventoryValueCost = 0;
    const deadStock: { article: string; description: string; stock: number; valueCost: number }[] = [];
    for (const [article, m] of meta) {
      if (m.stock <= 0) continue;
      const cost = latestCost(article) ?? 0;
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

    // --- Тренд: выручка + прибыль (FIFO) по дням ---
    const trendMap = new Map<string, { revenue: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) trendMap.set(key, { revenue: 0, profit: 0 });
    }
    for (const ln of periodLines) {
      const d = new Date(ln.t);
      const key = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = trendMap.get(key) ?? { revenue: 0, profit: 0 };
      e.revenue += ln.revenue;
      e.profit += ln.revenueCovered - ln.cost;
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
