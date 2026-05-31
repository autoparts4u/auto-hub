'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CircleDollarSign, ChevronDown, Phone } from 'lucide-react';
import { getContrastTextColor } from '@/lib/utils';
import type { DashboardTasks } from '@/lib/services/dashboardTasks';

type Debtor = DashboardTasks['debtors'][number];

const formatMoney = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const dateOnly = (iso: Date | string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

const orderPlural = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заказ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'заказа';
  return 'заказов';
};

function DebtorRow({ d, onClick }: { d: Debtor; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{d.client.name || d.client.fullName}</div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
          {d.client.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {d.client.phone}
            </span>
          )}
          <span>·</span>
          <span>
            {d.orderCount} {orderPlural(d.orderCount)}
          </span>
          <span>·</span>
          <span>посл. {dateOnly(d.lastIssuedAt)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-bold text-destructive">{formatMoney(d.totalDebt)} ₽</div>
      </div>
    </button>
  );
}

function StatusPill({ name, hexColor }: { name: string | null; hexColor: string | null }) {
  if (!name) return null;
  if (!hexColor)
    return (
      <Badge variant="secondary" className="ml-2">
        {name}
      </Badge>
    );
  return (
    <span
      className="ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: hexColor, color: getContrastTextColor(hexColor) }}
    >
      {name}
    </span>
  );
}

function DebtorOrdersModal({
  debtor,
  onClose,
  onOpenOrder,
}: {
  debtor: Debtor;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Долги · {debtor.client.name || debtor.client.fullName}</DialogTitle>
          <DialogDescription>
            {debtor.client.phone ? `${debtor.client.phone} · ` : ''}
            {debtor.orderCount} {orderPlural(debtor.orderCount)} ·{' '}
            <span className="font-semibold text-destructive">{formatMoney(debtor.totalDebt)} ₽</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {debtor.orders.map((o) => {
            const final = o.totalAmount - o.discount;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrder(o.id);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center text-sm font-medium">
                    #{o.id.slice(-6)}
                    <StatusPill name={o.orderStatusName} hexColor={o.orderStatusColor} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    выдан {dateOnly(o.issuedAt)} · к оплате {formatMoney(final)} ₽
                    {o.paidAmount > 0 && <> · оплачено {formatMoney(o.paidAmount)} ₽</>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-destructive">−{formatMoney(o.debt)} ₽</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DebtorsWidget({
  debtors,
  totalAmount,
  totalCount,
  onOpenOrder,
}: {
  debtors: Debtor[];
  totalAmount: number;
  totalCount: number;
  onOpenOrder: (orderId: string) => void;
}) {
  const [selected, setSelected] = useState<Debtor | null>(null);
  // На мобилке свёрнуто по умолчанию; на десктопе всегда видно через md:!block.
  const [open, setOpen] = useState(false);

  const shown = debtors.length;
  const isToneDanger = totalAmount > 0;

  return (
    <>
      <Card className={isToneDanger ? 'ring-1 ring-destructive/40' : ''}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex flex-1 items-center gap-2 text-left md:pointer-events-none md:cursor-default"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="size-4" />
              Должники
              <Badge variant="secondary" className="ml-1">
                {totalCount}
              </Badge>
              {totalAmount > 0 && (
                <span className="ml-2 text-sm font-bold text-destructive">
                  {formatMoney(totalAmount)} ₽
                </span>
              )}
            </CardTitle>
            <ChevronDown
              className={`ml-auto size-4 text-muted-foreground transition-transform md:hidden ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CardHeader>
        <CardContent className={`md:!block ${open ? '' : 'hidden'}`}>
          {shown === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Должников нет
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {debtors.map((d) => (
                <DebtorRow key={d.client.id} d={d} onClick={() => setSelected(d)} />
              ))}
            </div>
          )}
          {totalCount > shown && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              показаны топ {shown} из {totalCount} · полный список в /dashboard/orders
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <DebtorOrdersModal
          debtor={selected}
          onClose={() => setSelected(null)}
          onOpenOrder={onOpenOrder}
        />
      )}
    </>
  );
}
