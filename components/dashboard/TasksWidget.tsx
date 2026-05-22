'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CalendarClock,
  PackageCheck,
  PackageX,
  Hourglass,
  Truck,
  Clock,
  Undo2,
  Wallet,
  BellOff,
  Bell,
  Moon,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getContrastTextColor } from '@/lib/utils';
import type { DashboardTasks } from '@/lib/services/dashboardTasks';
import type { Client, OrderStatus } from '@/app/types/orders';
import type { PurchaseOrder, PurchaseStatus } from '@/app/types/purchases';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import OrderModal from '@/components/orders/OrderModal';
import PurchaseDetailsModal from '@/components/purchases/PurchaseDetailsModal';
import ReservationDetailsModal, {
  type ReservationDetails,
} from '@/components/reservations/ReservationDetailsModal';
import { PushToggle } from '@/components/dashboard/PushToggle';
import { DebtorsWidget } from '@/components/dashboard/DebtorsWidget';

type OrderItem = DashboardTasks['handoverToday'][number];
type PurchaseItem = DashboardTasks['purchasesOverdue'][number];
type ReservationItem = DashboardTasks['reservationsExpiringSoon'][number];
type ReturnItem = DashboardTasks['returnsStale'][number];

type EntityType = 'order' | 'purchase' | 'reservation' | 'return';

type ModalState =
  | { kind: 'order'; orderId: string }
  | { kind: 'purchase'; purchase: PurchaseOrder | null; purchaseId: string }
  | { kind: 'reservation'; reservation: ReservationDetails }
  | null;

const POLL_MS = 30_000;
const MUTE_STORAGE_KEY = 'dashboard-tasks-muted';
const ORIGINAL_TITLE_FALLBACK = 'Задачи — AutoHub';

// — Helpers ───────────────────────────────────────────────────────────
const dateTime = (iso: Date | string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const dateOnly = (iso: Date | string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const daysAgo = (iso: Date | string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return 'сегодня';
  if (days === 1) return '1 день назад';
  if (days < 5) return `${days} дня назад`;
  return `${days} дней назад`;
};

const minutesUntil = (iso: Date | string) => {
  const ms = new Date(iso).getTime() - Date.now();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `через ${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `через ${h}ч ${m}м`;
};

const tomorrowMorningIso = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(8, 0, 0, 0);
  return t.toISOString();
};

const playBeep = () => {
  try {
    type WebkitWindow = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as unknown as WebkitWindow;
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // браузер заблокировал — это нормально до первого user interaction
  }
};

// — Building blocks ──────────────────────────────────────────────────
function StatusPill({ name, hexColor }: { name: string; hexColor: string | null | undefined }) {
  if (!hexColor) return <Badge variant="secondary">{name}</Badge>;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: hexColor, color: getContrastTextColor(hexColor) }}
    >
      {name}
    </span>
  );
}

function SnoozeMenu({
  onSnooze,
}: {
  onSnooze: (opts: { hours?: number; untilIso?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const pick = (opts: { hours?: number; untilIso?: string }) => {
    onSnooze(opts);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Отложить"
          title="Отложить"
        >
          <Moon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-auto p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <button
            type="button"
            className="rounded-sm px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            onClick={() => pick({ hours: 1 })}
          >
            на 1 час
          </button>
          <button
            type="button"
            className="rounded-sm px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            onClick={() => pick({ hours: 4 })}
          >
            на 4 часа
          </button>
          <button
            type="button"
            className="rounded-sm px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            onClick={() => pick({ untilIso: tomorrowMorningIso() })}
          >
            до завтра 08:00
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  onOpen,
  onSnooze,
  children,
  showSnooze = true,
}: {
  onOpen: () => void;
  onSnooze: (opts: { hours?: number; untilIso?: string }) => void;
  children: React.ReactNode;
  showSnooze?: boolean;
}) {
  return (
    <div className="group flex items-stretch rounded-md border bg-card transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center justify-between gap-3 rounded-l-md px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </button>
      {showSnooze && (
        <div className="flex items-center pr-1">
          <SnoozeMenu onSnooze={onSnooze} />
        </div>
      )}
    </div>
  );
}

function OrderRowContent({
  o,
  rightLabel,
  showProgress,
}: {
  o: OrderItem;
  rightLabel?: string;
  showProgress?: boolean;
}) {
  const total = o.orderItems.length;
  const picked = o.orderItems.filter((i) => i.pickedAt).length;
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{o.client?.name || o.client?.fullName || 'Без клиента'}</span>
          <StatusPill name={o.orderStatus?.name ?? ''} hexColor={o.orderStatus?.hexColor} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          #{o.id.slice(-6)} · {total} поз.
          {showProgress && (
            <>
              {' '}· собрано {picked}/{total}
            </>
          )}
          {o.deliveryMethod?.name && <> · {o.deliveryMethod.name}</>}
        </div>
      </div>
      {rightLabel && <div className="shrink-0 text-right text-xs text-muted-foreground">{rightLabel}</div>}
    </>
  );
}

function PurchaseRowContent({ p }: { p: PurchaseItem }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{p.supplier?.name || 'Поставщик'}</span>
          <StatusPill name={p.purchaseStatus?.name ?? ''} hexColor={p.purchaseStatus?.hexColor} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          #{p.id.slice(-6)} · {p.items.length} поз.
        </div>
      </div>
      <div className="shrink-0 text-right text-xs">
        <div className="font-medium text-destructive">{dateOnly(p.expectedAt)}</div>
        <div className="text-muted-foreground">{daysAgo(p.expectedAt!)}</div>
      </div>
    </>
  );
}

function ReservationRowContent({ r }: { r: ReservationItem }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {r.autopart?.article} — {r.autopart?.description}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {r.client?.name || 'Клиент'} · {r.quantity} шт
          {r.warehouse?.name && <> · {r.warehouse.name}</>}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs">
        <div className="font-medium">{minutesUntil(r.expiresAt)}</div>
        <div className="text-muted-foreground">до {dateTime(r.expiresAt)}</div>
      </div>
    </>
  );
}

function ReturnRowContent({ r }: { r: ReturnItem }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{r.client?.name || 'Без клиента'}</span>
          <StatusPill name={r.returnStatus?.name ?? ''} hexColor={r.returnStatus?.hexColor} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {r.order?.id ? <>заказ #{r.order.id.slice(-6)} · </> : null}
          создан {dateOnly(r.createdAt)}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">{daysAgo(r.createdAt)}</div>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  tone,
  href,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  tone: 'default' | 'warn' | 'danger';
  href?: string;
  children: React.ReactNode;
}) {
  const toneRing =
    tone === 'danger'
      ? 'ring-1 ring-destructive/40'
      : tone === 'warn'
      ? 'ring-1 ring-amber-400/40'
      : '';
  return (
    <Card className={toneRing}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        </CardTitle>
        {href && (
          <Link href={href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            открыть →
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

const PREVIEW = 5;

// — Main widget ──────────────────────────────────────────────────────
export function TasksWidget({ data }: { data: DashboardTasks }) {
  const router = useRouter();
  const [liveData, setLiveData] = useState<DashboardTasks>(data);
  const [modal, setModal] = useState<ModalState>(null);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [purchaseStatuses, setPurchaseStatuses] = useState<PurchaseStatus[]>([]);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [muted, setMuted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [loadingNewOrderDeps, setLoadingNewOrderDeps] = useState(false);

  // следим за уже виденными «срочными» id, чтобы пикать только на новых
  const seenAlertingIds = useRef<Set<string>>(new Set());
  const modalRef = useRef<ModalState>(null);
  const mutedRef = useRef(false);
  modalRef.current = modal;
  mutedRef.current = muted;

  // первичная загрузка статусов + посев seenAlertingIds + восстановление mute
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/order-statuses').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/purchase-statuses').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([os, ps]) => {
        if (cancelled) return;
        setOrderStatuses(os);
        setPurchaseStatuses(ps);
      })
      .catch(() => {});

    const ids = new Set<string>();
    for (const o of data.handoverToday) ids.add(`order:${o.id}`);
    for (const o of data.handoverOverdue) ids.add(`order:${o.id}`);
    for (const p of data.purchasesOverdue) ids.add(`purchase:${p.id}`);
    for (const r of data.reservationsExpiringSoon) ids.add(`reservation:${r.id}`);
    seenAlertingIds.current = ids;

    try {
      setMuted(localStorage.getItem(MUTE_STORAGE_KEY) === '1');
    } catch {}

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // обновление title во вкладке
  useEffect(() => {
    const original = document.title || ORIGINAL_TITLE_FALLBACK;
    const urgent =
      liveData.handoverToday.length +
      liveData.handoverOverdue.length +
      liveData.purchasesOverdue.length +
      liveData.reservationsExpiringSoon.length;
    document.title = urgent > 0 ? `(${urgent}) Задачи — AutoHub` : 'Задачи — AutoHub';
    return () => {
      document.title = original.startsWith('(') ? 'Задачи — AutoHub' : original;
    };
  }, [liveData]);

  // polling
  const fetchFresh = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setRefreshing(true);
      const res = await fetch('/api/dashboard/tasks', { cache: 'no-store' });
      if (!res.ok) return;
      const fresh = (await res.json()) as DashboardTasks;
      setLiveData(fresh);

      // diff alerting ids
      const freshIds = new Set<string>();
      for (const o of fresh.handoverToday) freshIds.add(`order:${o.id}`);
      for (const o of fresh.handoverOverdue) freshIds.add(`order:${o.id}`);
      for (const p of fresh.purchasesOverdue) freshIds.add(`purchase:${p.id}`);
      for (const r of fresh.reservationsExpiringSoon) freshIds.add(`reservation:${r.id}`);

      let hasNew = false;
      for (const id of freshIds) {
        if (!seenAlertingIds.current.has(id)) {
          hasNew = true;
          break;
        }
      }
      seenAlertingIds.current = freshIds;
      if (hasNew && !mutedRef.current) playBeep();
    } catch {
      // ignore — следующая итерация попробует снова
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (modalRef.current) return; // не дёргаем пока правят
      fetchFresh(false);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchFresh]);

  const openNewOrder = async () => {
    setLoadingNewOrderDeps(true);
    try {
      if (!clients) {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = (await res.json()) as Client[];
          setClients(data);
        } else {
          toast.error('Не удалось загрузить список клиентов');
          return;
        }
      }
      setShowNewOrder(true);
    } catch (e) {
      console.error(e);
      toast.error('Не удалось открыть форму заказа');
    } finally {
      setLoadingNewOrderDeps(false);
    }
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
      } catch {}
      if (!next) playBeep(); // подтверждение что звук работает
      return next;
    });
  };

  // — Модалки ──────────────────────────────────────────────────────
  const openOrder = useCallback((orderId: string) => setModal({ kind: 'order', orderId }), []);

  const openReservation = useCallback(
    (r: ReservationItem) =>
      setModal({
        kind: 'reservation',
        reservation: {
          id: r.id,
          quantity: r.quantity,
          status: r.status as ReservationDetails['status'],
          expiresAt: r.expiresAt,
          client: r.client ? { id: r.client.id, name: r.client.name, phone: r.client.phone ?? null } : null,
          autopart: r.autopart
            ? { id: r.autopart.id, article: r.autopart.article, description: r.autopart.description }
            : null,
          warehouse: r.warehouse ? { id: r.warehouse.id, name: r.warehouse.name } : null,
        },
      }),
    []
  );

  const openPurchase = useCallback(async (purchaseId: string) => {
    setModal({ kind: 'purchase', purchase: null, purchaseId });
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`);
      if (!res.ok) throw new Error('fetch failed');
      const full = (await res.json()) as PurchaseOrder;
      setModal((m) =>
        m && m.kind === 'purchase' && m.purchaseId === purchaseId ? { ...m, purchase: full } : m
      );
    } catch (e) {
      console.error(e);
      toast.error('Не удалось загрузить поступление');
      setModal(null);
    }
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const handlePurchaseStatusChange = async (statusId: number) => {
    if (!modal || modal.kind !== 'purchase' || !modal.purchase) return;
    try {
      const res = await fetch(`/api/purchases/${modal.purchase.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseStatus_id: statusId }),
      });
      if (res.ok) {
        toast.success('Статус поступления обновлён');
        closeModal();
        await fetchFresh(true);
        router.refresh();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error?.error || 'Ошибка обновления статуса');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка обновления статуса');
    }
  };

  // — Snooze ───────────────────────────────────────────────────────
  const removeFromLive = (type: EntityType, id: string) => {
    setLiveData((prev) => {
      const filterOrder = <T extends { id: string }>(arr: T[]) =>
        type === 'order' ? arr.filter((x) => x.id !== id) : arr;
      const filterPurchase = <T extends { id: string }>(arr: T[]) =>
        type === 'purchase' ? arr.filter((x) => x.id !== id) : arr;
      const filterReservation = <T extends { id: string }>(arr: T[]) =>
        type === 'reservation' ? arr.filter((x) => x.id !== id) : arr;
      const filterReturn = <T extends { id: string }>(arr: T[]) =>
        type === 'return' ? arr.filter((x) => x.id !== id) : arr;
      return {
        ...prev,
        handoverToday: filterOrder(prev.handoverToday),
        handoverOverdue: filterOrder(prev.handoverOverdue),
        inAssembly: filterOrder(prev.inAssembly),
        staleOrders: filterOrder(prev.staleOrders),
        unpaidIssued: filterOrder(prev.unpaidIssued),
        purchasesOverdue: filterPurchase(prev.purchasesOverdue),
        reservationsExpiringSoon: filterReservation(prev.reservationsExpiringSoon),
        returnsStale: filterReturn(prev.returnsStale),
      };
    });
  };

  const snooze = async (
    type: EntityType,
    id: string,
    opts: { hours?: number; untilIso?: string }
  ) => {
    // оптимистично убираем
    removeFromLive(type, id);
    seenAlertingIds.current.delete(`${type}:${id}`);
    try {
      const res = await fetch('/api/dashboard/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: type, entityId: id, ...opts }),
      });
      if (res.ok) {
        const labelHrs =
          opts.hours != null ? `на ${opts.hours}ч` : opts.untilIso ? 'до завтра' : '';
        toast.success(`Отложено ${labelHrs}`);
      } else {
        toast.error('Не удалось отложить');
        await fetchFresh(true); // вернуть состояние
      }
    } catch (e) {
      console.error(e);
      toast.error('Не удалось отложить');
      await fetchFresh(true);
    }
  };

  const {
    handoverToday,
    handoverOverdue,
    inAssembly,
    staleOrders,
    purchasesOverdue,
    reservationsExpiringSoon,
    returnsStale,
    unpaidIssued,
  } = liveData;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={openNewOrder}
          disabled={loadingNewOrderDeps || orderStatuses.length === 0}
        >
          <Plus className="size-4" />
          <span className="ml-1">Новый заказ</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchFresh(true)}
          disabled={refreshing}
          aria-label="Обновить"
          title="Обновить"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          title={muted ? 'Звук выключен' : 'Звук включён'}
        >
          {muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        </Button>
        <PushToggle />
      </div>

      <DebtorsWidget
        debtors={liveData.debtors}
        totalAmount={liveData.debtorsTotalAmount}
        totalCount={liveData.debtorsTotalCount}
        onOpenOrder={openOrder}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Section
          title="Сегодня к выдаче"
          icon={CalendarClock}
          count={handoverToday.length}
          tone="default"
          href="/dashboard/orders"
        >
          {handoverToday.length === 0 ? (
            <Empty text="На сегодня выдач не запланировано" />
          ) : (
            handoverToday.slice(0, PREVIEW).map((o) => (
              <Row key={o.id} onOpen={() => openOrder(o.id)} onSnooze={(opts) => snooze('order', o.id, opts)}>
                <OrderRowContent o={o} rightLabel={dateTime(o.scheduledHandoverAt)} showProgress />
              </Row>
            ))
          )}
          {handoverToday.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {handoverToday.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title="Просрочена выдача"
          icon={PackageX}
          count={handoverOverdue.length}
          tone="danger"
          href="/dashboard/orders"
        >
          {handoverOverdue.length === 0 ? (
            <Empty text="Просроченных нет" />
          ) : (
            handoverOverdue.slice(0, PREVIEW).map((o) => (
              <Row key={o.id} onOpen={() => openOrder(o.id)} onSnooze={(opts) => snooze('order', o.id, opts)}>
                <OrderRowContent o={o} rightLabel={dateOnly(o.scheduledHandoverAt)} showProgress />
              </Row>
            ))
          )}
          {handoverOverdue.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {handoverOverdue.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title="В сборке"
          icon={PackageCheck}
          count={inAssembly.length}
          tone="default"
          href="/dashboard/orders"
        >
          {inAssembly.length === 0 ? (
            <Empty text="Ничего не собирается" />
          ) : (
            inAssembly.slice(0, PREVIEW).map((o) => (
              <Row key={o.id} onOpen={() => openOrder(o.id)} onSnooze={(opts) => snooze('order', o.id, opts)}>
                <OrderRowContent o={o} rightLabel={dateOnly(o.scheduledHandoverAt)} showProgress />
              </Row>
            ))
          )}
          {inAssembly.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {inAssembly.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title={`Зависшие (${liveData.thresholds.staleOrderDays}д+)`}
          icon={Hourglass}
          count={staleOrders.length}
          tone="warn"
          href="/dashboard/orders"
        >
          {staleOrders.length === 0 ? (
            <Empty text="Зависших заказов нет" />
          ) : (
            staleOrders.slice(0, PREVIEW).map((o) => (
              <Row key={o.id} onOpen={() => openOrder(o.id)} onSnooze={(opts) => snooze('order', o.id, opts)}>
                <OrderRowContent o={o} rightLabel={daysAgo(o.createdAt)} />
              </Row>
            ))
          )}
          {staleOrders.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {staleOrders.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title="Поставки просрочены"
          icon={Truck}
          count={purchasesOverdue.length}
          tone="danger"
          href="/dashboard/orders"
        >
          {purchasesOverdue.length === 0 ? (
            <Empty text="Все поставки в срок" />
          ) : (
            purchasesOverdue.slice(0, PREVIEW).map((p) => (
              <Row key={p.id} onOpen={() => openPurchase(p.id)} onSnooze={(opts) => snooze('purchase', p.id, opts)}>
                <PurchaseRowContent p={p} />
              </Row>
            ))
          )}
          {purchasesOverdue.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {purchasesOverdue.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title={`Резервации <${liveData.thresholds.reservationWarnMinutes}мин`}
          icon={Clock}
          count={reservationsExpiringSoon.length}
          tone="warn"
          href="/dashboard/reservations"
        >
          {reservationsExpiringSoon.length === 0 ? (
            <Empty text="Нет истекающих резерваций" />
          ) : (
            reservationsExpiringSoon.slice(0, PREVIEW).map((r) => (
              <Row
                key={r.id}
                onOpen={() => openReservation(r)}
                onSnooze={(opts) => snooze('reservation', r.id, opts)}
              >
                <ReservationRowContent r={r} />
              </Row>
            ))
          )}
          {reservationsExpiringSoon.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {reservationsExpiringSoon.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title={`Возвраты ${liveData.thresholds.staleReturnDays}д+`}
          icon={Undo2}
          count={returnsStale.length}
          tone="warn"
          href="/dashboard/orders"
        >
          {returnsStale.length === 0 ? (
            <Empty text="Возвратов без обработки нет" />
          ) : (
            returnsStale.slice(0, PREVIEW).map((r) => {
              const orderId = r.order?.id;
              return (
                <Row
                  key={r.id}
                  onOpen={() =>
                    orderId
                      ? openOrder(orderId)
                      : router.push(`/dashboard/orders?tab=returns&focus=${r.id}`)
                  }
                  onSnooze={(opts) => snooze('return', r.id, opts)}
                >
                  <ReturnRowContent r={r} />
                </Row>
              );
            })
          )}
          {returnsStale.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {returnsStale.length - PREVIEW}
            </div>
          )}
        </Section>

        <Section
          title="Выдан, не оплачен"
          icon={Wallet}
          count={unpaidIssued.length}
          tone="warn"
          href="/dashboard/orders?unpaidIssued=1"
        >
          {unpaidIssued.length === 0 ? (
            <Empty text="Все выданные оплачены" />
          ) : (
            unpaidIssued.slice(0, PREVIEW).map((o) => (
              <Row key={o.id} onOpen={() => openOrder(o.id)} onSnooze={(opts) => snooze('order', o.id, opts)}>
                <OrderRowContent o={o} rightLabel={`выдан ${dateOnly(o.issuedAt)}`} />
              </Row>
            ))
          )}
          {unpaidIssued.length > PREVIEW && (
            <div className="text-center text-xs text-muted-foreground">
              и ещё {unpaidIssued.length - PREVIEW}
            </div>
          )}
        </Section>
      </div>

      {modal?.kind === 'order' && (
        <OrderDetailsModal
          open
          onClose={async () => {
            closeModal();
            await fetchFresh(true);
            router.refresh();
          }}
          orderId={modal.orderId}
          statuses={orderStatuses}
        />
      )}

      {modal?.kind === 'purchase' && modal.purchase && (
        <PurchaseDetailsModal
          purchase={modal.purchase}
          statuses={purchaseStatuses}
          onClose={closeModal}
          onStatusChange={handlePurchaseStatusChange}
        />
      )}

      {modal?.kind === 'reservation' && (
        <ReservationDetailsModal
          reservation={modal.reservation}
          onClose={closeModal}
          onChanged={async () => {
            await fetchFresh(true);
            router.refresh();
          }}
        />
      )}

      {showNewOrder && clients && (
        <OrderModal
          open={showNewOrder}
          onClose={async () => {
            setShowNewOrder(false);
            await fetchFresh(true);
            router.refresh();
          }}
          clients={clients}
          statuses={orderStatuses}
        />
      )}
    </>
  );
}
