import prisma from '@/lib/db/db';

const STALE_ORDER_DAYS = 3;
const STALE_RETURN_DAYS = 7;
const RESERVATION_WARN_MINUTES = 60;

const orderInclude = {
  client: { select: { id: true, name: true, fullName: true, phone: true } },
  orderStatus: { select: { id: true, name: true, hexColor: true, isLast: true } },
  deliveryMethod: { select: { id: true, name: true, hexColor: true } },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      article: true,
      description: true,
      pickedAt: true,
    },
  },
} as const;

const purchaseInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  purchaseStatus: { select: { id: true, name: true, hexColor: true, isLast: true } },
  items: { select: { id: true, quantity: true, article: true } },
} as const;

const reservationInclude = {
  client: { select: { id: true, name: true, phone: true } },
  autopart: { select: { id: true, article: true, description: true } },
  warehouse: { select: { id: true, name: true } },
} as const;

const returnInclude = {
  client: { select: { id: true, name: true, phone: true } },
  returnStatus: { select: { id: true, name: true, hexColor: true } },
  order: { select: { id: true, createdAt: true } },
} as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getDashboardTasks() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const staleOrderCutoff = new Date(now.getTime() - STALE_ORDER_DAYS * 24 * 60 * 60 * 1000);
  const staleReturnCutoff = new Date(now.getTime() - STALE_RETURN_DAYS * 24 * 60 * 60 * 1000);
  const reservationWarnCutoff = new Date(now.getTime() + RESERVATION_WARN_MINUTES * 60 * 1000);

  const baseOrderFilter = {
    cancelledAt: null,
    issuedAt: null,
    orderStatus: { isLast: false },
  };

  // Активные snooze — снятые задачи не показываем
  const activeSnoozes = await prisma.dashboardSnooze.findMany({
    where: { snoozedUntil: { gt: now } },
    select: { entityType: true, entityId: true },
  });
  const snoozedKey = (type: string, id: string) => `${type}:${id}`;
  const snoozedSet = new Set(activeSnoozes.map((s) => snoozedKey(s.entityType, s.entityId)));
  const notSnoozedOrder = <T extends { id: string }>(arr: T[]) =>
    arr.filter((x) => !snoozedSet.has(snoozedKey('order', x.id)));
  const notSnoozedPurchase = <T extends { id: string }>(arr: T[]) =>
    arr.filter((x) => !snoozedSet.has(snoozedKey('purchase', x.id)));
  const notSnoozedReservation = <T extends { id: string }>(arr: T[]) =>
    arr.filter((x) => !snoozedSet.has(snoozedKey('reservation', x.id)));
  const notSnoozedReturn = <T extends { id: string }>(arr: T[]) =>
    arr.filter((x) => !snoozedSet.has(snoozedKey('return', x.id)));

  const [
    handoverToday,
    handoverOverdue,
    inAssembly,
    staleOrders,
    purchasesOverdue,
    reservationsExpiringSoon,
    returnsStale,
    unpaidIssued,
  ] = await Promise.all([
    prisma.orders.findMany({
      where: {
        ...baseOrderFilter,
        scheduledHandoverAt: { gte: todayStart, lte: todayEnd },
      },
      include: orderInclude,
      orderBy: { scheduledHandoverAt: 'asc' },
    }),
    prisma.orders.findMany({
      where: {
        ...baseOrderFilter,
        scheduledHandoverAt: { lt: todayStart },
      },
      include: orderInclude,
      orderBy: { scheduledHandoverAt: 'asc' },
    }),
    prisma.orders.findMany({
      where: {
        ...baseOrderFilter,
        scheduledHandoverAt: { not: null, gt: todayEnd },
        orderItems: { some: { pickedAt: null } },
      },
      include: orderInclude,
      orderBy: { scheduledHandoverAt: 'asc' },
      take: 20,
    }),
    prisma.orders.findMany({
      where: {
        ...baseOrderFilter,
        scheduledHandoverAt: null,
        createdAt: { lt: staleOrderCutoff },
      },
      include: orderInclude,
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.purchaseOrders.findMany({
      where: {
        receivedAt: null,
        expectedAt: { not: null, lt: todayStart },
        purchaseStatus: { isLast: false },
      },
      include: purchaseInclude,
      orderBy: { expectedAt: 'asc' },
      take: 20,
    }),
    prisma.reservations.findMany({
      where: {
        status: 'active',
        expiresAt: { gt: now, lt: reservationWarnCutoff },
      },
      include: reservationInclude,
      orderBy: { expiresAt: 'asc' },
      take: 20,
    }),
    prisma.returns.findMany({
      where: {
        resolvedAt: null,
        createdAt: { lt: staleReturnCutoff },
      },
      include: returnInclude,
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.orders.findMany({
      where: {
        cancelledAt: null,
        issuedAt: { not: null },
        paidAt: null,
      },
      include: orderInclude,
      orderBy: { issuedAt: 'asc' },
      take: 20,
    }),
  ]);

  // unpaidIssued: keep only those where paidAmount < totalAmount - discount
  const unpaidIssuedFiltered = unpaidIssued.filter((o) => {
    if (!o.totalAmount) return false;
    const finalAmount = o.totalAmount - o.discount;
    return o.paidAmount < finalAmount;
  });

  // — Должники: все выданные неоплаченные, группируем по клиенту
  const allUnpaidIssued = await prisma.orders.findMany({
    where: {
      cancelledAt: null,
      issuedAt: { not: null },
      paidAmount: { gte: 0 },
      totalAmount: { not: null },
    },
    select: {
      id: true,
      totalAmount: true,
      discount: true,
      paidAmount: true,
      issuedAt: true,
      createdAt: true,
      client: { select: { id: true, name: true, fullName: true, phone: true } },
      orderStatus: { select: { id: true, name: true, hexColor: true } },
    },
  });

  type DebtorOrder = {
    id: string;
    totalAmount: number;
    discount: number;
    paidAmount: number;
    debt: number;
    issuedAt: Date | string;
    orderStatusName: string | null;
    orderStatusColor: string | null;
  };

  const debtorMap = new Map<
    string,
    {
      client: { id: string; name: string; fullName: string; phone: string | null };
      totalDebt: number;
      orderCount: number;
      lastIssuedAt: Date;
      orders: DebtorOrder[];
    }
  >();
  for (const o of allUnpaidIssued) {
    if (!o.totalAmount || !o.client) continue;
    const final = o.totalAmount - o.discount;
    const debt = final - o.paidAmount;
    if (debt <= 0) continue;
    const key = o.client.id;
    const existing = debtorMap.get(key);
    const orderRow: DebtorOrder = {
      id: o.id,
      totalAmount: o.totalAmount,
      discount: o.discount,
      paidAmount: o.paidAmount,
      debt,
      issuedAt: o.issuedAt!,
      orderStatusName: o.orderStatus?.name ?? null,
      orderStatusColor: o.orderStatus?.hexColor ?? null,
    };
    if (!existing) {
      debtorMap.set(key, {
        client: o.client,
        totalDebt: debt,
        orderCount: 1,
        lastIssuedAt: o.issuedAt!,
        orders: [orderRow],
      });
    } else {
      existing.totalDebt += debt;
      existing.orderCount += 1;
      existing.orders.push(orderRow);
      if (o.issuedAt! > existing.lastIssuedAt) existing.lastIssuedAt = o.issuedAt!;
    }
  }
  const debtors = Array.from(debtorMap.values())
    .map((d) => ({
      ...d,
      orders: d.orders.sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      ),
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
  const debtorsTotalAmount = debtors.reduce((s, d) => s + d.totalDebt, 0);
  const debtorsTop = debtors.slice(0, 12);

  return {
    generatedAt: now.toISOString(),
    thresholds: {
      staleOrderDays: STALE_ORDER_DAYS,
      staleReturnDays: STALE_RETURN_DAYS,
      reservationWarnMinutes: RESERVATION_WARN_MINUTES,
    },
    handoverToday: notSnoozedOrder(handoverToday),
    handoverOverdue: notSnoozedOrder(handoverOverdue),
    inAssembly: notSnoozedOrder(inAssembly),
    staleOrders: notSnoozedOrder(staleOrders),
    purchasesOverdue: notSnoozedPurchase(purchasesOverdue),
    reservationsExpiringSoon: notSnoozedReservation(reservationsExpiringSoon),
    returnsStale: notSnoozedReturn(returnsStale),
    unpaidIssued: notSnoozedOrder(unpaidIssuedFiltered),
    debtors: debtorsTop,
    debtorsTotalAmount,
    debtorsTotalCount: debtors.length,
  };
}

export type DashboardTasks = Awaited<ReturnType<typeof getDashboardTasks>>;
