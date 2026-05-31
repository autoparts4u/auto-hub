// Пресеты дашборда — единый источник правды для URL-параметров и фильтрации в таблицах.
// Используется и в TasksWidget (формирование hrefs), и в OrdersTable/PurchasesTable/
// ReturnsTable/ReservationsTable (чтение URL + клиентская фильтрация).

// — Orders ─────────────────────────────────────────────────────────────────
export const ORDER_PRESETS = [
  'handoverToday',
  'handoverOverdue',
  'inAssembly',
  'stale',
] as const;
export type OrderPreset = (typeof ORDER_PRESETS)[number];

export const ORDER_PRESET_LABELS: Record<OrderPreset, string> = {
  handoverToday: 'Сегодня к выдаче',
  handoverOverdue: 'Просрочена выдача',
  inAssembly: 'В сборке (не все позиции собраны)',
  stale: 'Зависшие — 3+ дн. без движения',
};

export const STALE_ORDER_DAYS = 3;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// Generic, минимально-связанный с конкретным типом — поля используются по дату-структуре.
interface PresetOrderShape {
  cancelledAt: Date | string | null;
  issuedAt: Date | string | null;
  createdAt: Date | string;
  scheduledHandoverAt: Date | string | null;
  orderStatus?: { isLast: boolean } | null;
  orderItems?: { pickedAt: Date | string | null }[];
}

export function isOrderPreset(value: string | null | undefined): value is OrderPreset {
  return !!value && (ORDER_PRESETS as readonly string[]).includes(value);
}

export function filterOrdersByPreset<T extends PresetOrderShape>(
  orders: T[],
  preset: OrderPreset
): T[] {
  const today0 = startOfToday();
  const today1 = endOfToday();
  const staleCutoff = new Date(today0.getTime() - STALE_ORDER_DAYS * 24 * 60 * 60 * 1000);

  return orders.filter((o) => {
    if (o.cancelledAt) return false;
    if (o.issuedAt) return false;
    if (o.orderStatus?.isLast) return false;

    const handover = o.scheduledHandoverAt ? new Date(o.scheduledHandoverAt) : null;

    switch (preset) {
      case 'handoverToday':
        return !!handover && handover >= today0 && handover <= today1;
      case 'handoverOverdue':
        return !!handover && handover < today0;
      case 'inAssembly':
        if (!handover || handover <= today1) return false;
        const items = o.orderItems ?? [];
        return items.some((i) => !i.pickedAt);
      case 'stale':
        if (handover) return false;
        return new Date(o.createdAt) < staleCutoff;
    }
  });
}

// — Purchases ─────────────────────────────────────────────────────────────
export const PURCHASE_PRESETS = ['overdue'] as const;
export type PurchasePreset = (typeof PURCHASE_PRESETS)[number];

export const PURCHASE_PRESET_LABELS: Record<PurchasePreset, string> = {
  overdue: 'Поставки просрочены',
};

export function isPurchasePreset(v: string | null | undefined): v is PurchasePreset {
  return !!v && (PURCHASE_PRESETS as readonly string[]).includes(v);
}

interface PresetPurchaseShape {
  expectedAt: Date | string | null;
  receivedAt: Date | string | null;
  purchaseStatus?: { isLast: boolean };
}

export function filterPurchasesByPreset<T extends PresetPurchaseShape>(
  purchases: T[],
  preset: PurchasePreset
): T[] {
  const today0 = startOfToday();
  return purchases.filter((p) => {
    if (preset === 'overdue') {
      if (p.receivedAt) return false;
      if (p.purchaseStatus?.isLast) return false;
      return !!p.expectedAt && new Date(p.expectedAt) < today0;
    }
    return true;
  });
}

// — Returns ───────────────────────────────────────────────────────────────
export const RETURN_PRESETS = ['stale'] as const;
export type ReturnPreset = (typeof RETURN_PRESETS)[number];

export const RETURN_PRESET_LABELS: Record<ReturnPreset, string> = {
  stale: 'Возвраты без обработки 7+ дн',
};

export const STALE_RETURN_DAYS = 7;

export function isReturnPreset(v: string | null | undefined): v is ReturnPreset {
  return !!v && (RETURN_PRESETS as readonly string[]).includes(v);
}

interface PresetReturnShape {
  resolvedAt: Date | string | null;
  createdAt: Date | string;
}

export function filterReturnsByPreset<T extends PresetReturnShape>(
  returns: T[],
  preset: ReturnPreset
): T[] {
  const cutoff = new Date(Date.now() - STALE_RETURN_DAYS * 24 * 60 * 60 * 1000);
  return returns.filter((r) => {
    if (preset === 'stale') {
      if (r.resolvedAt) return false;
      return new Date(r.createdAt) < cutoff;
    }
    return true;
  });
}

// — Reservations ──────────────────────────────────────────────────────────
export const RESERVATION_PRESETS = ['expiringSoon'] as const;
export type ReservationPreset = (typeof RESERVATION_PRESETS)[number];

export const RESERVATION_PRESET_LABELS: Record<ReservationPreset, string> = {
  expiringSoon: 'Резервации истекают <60 мин',
};

export const RESERVATION_WARN_MINUTES = 60;

export function isReservationPreset(v: string | null | undefined): v is ReservationPreset {
  return !!v && (RESERVATION_PRESETS as readonly string[]).includes(v);
}

interface PresetReservationShape {
  status: string;
  expiresAt: Date | string;
}

export function filterReservationsByPreset<T extends PresetReservationShape>(
  reservations: T[],
  preset: ReservationPreset
): T[] {
  const now = Date.now();
  const cutoff = now + RESERVATION_WARN_MINUTES * 60 * 1000;
  return reservations.filter((r) => {
    if (preset === 'expiringSoon') {
      if (r.status !== 'active') return false;
      const expires = new Date(r.expiresAt).getTime();
      return expires > now && expires < cutoff;
    }
    return true;
  });
}
