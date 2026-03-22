'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Clock, ShoppingCart } from 'lucide-react';
import { AutopartWithStock } from '@/app/types/autoparts';

export interface CartItem {
  part: AutopartWithStock;
  quantity: number;
}

interface Props {
  cart: CartItem[];
  warehouseAccessId: number | null;
  priceAccessId: number | null;
  reservationSummary: Record<string, { reservedCount: number; nearestExpiry: string | null }>;
  onClose: () => void;
  onSuccess: (succeededIds: string[]) => void;
  onItemRemoved?: (partId: string) => void;
}

export function BulkReservationModal({ cart: initialCart, warehouseAccessId, priceAccessId, reservationSummary, onClose, onSuccess, onItemRemoved }: Props) {
  const [items, setItems] = useState<CartItem[]>(() => initialCart.map((i) => ({ ...i })));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setDurationMinutes(data.reservationDurationMinutes ?? 1440))
      .catch(() => setDurationMinutes(1440));
  }, []);

  const durationLabel =
    durationMinutes === null
      ? '...'
      : durationMinutes >= 60
        ? `${Math.round(durationMinutes / 60)} ч.`
        : `${durationMinutes} мин.`;

  const getItemPrice = (part: AutopartWithStock) => {
    if (!priceAccessId) return null;
    return part.prices.find((p) => p.priceType.id === priceAccessId)?.price ?? null;
  };

  const totalSum = items.reduce((sum, item) => {
    const price = getItemPrice(item.part);
    return price !== null ? sum + price * item.quantity : sum;
  }, 0);

  const hasPrices = priceAccessId && items.some((i) => getItemPrice(i.part) !== null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  const getAvailable = (part: AutopartWithStock) => {
    const warehouses = warehouseAccessId
      ? part.warehouses.filter((w) => w.warehouseId === warehouseAccessId)
      : part.warehouses;
    const physical = warehouses.reduce((sum, w) => sum + w.quantity, 0);
    const reserved = reservationSummary[part.id]?.reservedCount ?? 0;
    return Math.max(0, physical - reserved);
  };

  const updateQty = (partId: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.part.id === partId ? { ...i, quantity: parseInt(value) || 1 } : i))
    );
  };

  const removeItem = (partId: string) => {
    setItems((prev) => prev.filter((i) => i.part.id !== partId));
    onItemRemoved?.(partId);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reservations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            autopartId: i.part.id,
            quantity: i.quantity,
            notes: notes.trim() || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Ошибка при резервации');
        return;
      }

      const { results, successCount, durationMinutes: dur } = data as {
        results: { autopartId: string; success: boolean; error?: string }[];
        successCount: number;
        durationMinutes: number;
      };

      const succeededIds = results.filter((r) => r.success).map((r) => r.autopartId);
      const failed = results.filter((r) => !r.success);

      if (successCount > 0) {
        const durLabel = dur >= 60 ? `${Math.round(dur / 60)} ч.` : `${dur} мин.`;
        toast.success(
          successCount === items.length
            ? `Зарезервировано ${successCount} дет. на ${durLabel}`
            : `Зарезервировано ${successCount} из ${items.length} деталей на ${durLabel}`,
          { duration: 6000 }
        );
      }

      for (const fail of failed) {
        const item = items.find((i) => i.part.id === fail.autopartId);
        toast.error(`${item?.part.article ?? fail.autopartId}: ${fail.error}`, { duration: 5000 });
      }

      if (successCount > 0) {
        onSuccess(succeededIds);
      }
    } catch {
      toast.error('Ошибка при создании резерваций');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            Резервирование деталей
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'})
            </span>
          </DialogTitle>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет позиций</p>
          ) : (
            items.map((item) => {
              const available = getAvailable(item.part);
              return (
                <div
                  key={item.part.id}
                  className="flex items-center gap-3 border rounded-lg px-3 py-2.5 bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm">{item.part.article}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.part.description}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>В наличии: <span className="text-primary font-semibold">{available} шт.</span></span>
                      {getItemPrice(item.part) !== null && (
                        <span className="text-foreground font-medium">
                          {formatCurrency(getItemPrice(item.part)!)} × {item.quantity} = {formatCurrency(getItemPrice(item.part)! * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*$/.test(val)) updateQty(item.part.id, val);
                      }}
                      onBlur={() => {
                        if (!item.quantity || item.quantity < 1) updateQty(item.part.id, '1');
                        else if (item.quantity > available) updateQty(item.part.id, String(available));
                      }}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeItem(item.part.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t space-y-3 flex-shrink-0">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Примечание (необязательно)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Примечание ко всем резервациям..."
              maxLength={200}
            />
          </div>

          {hasPrices && (
            <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
              <span>Итого:</span>
              <span className="text-primary">{formatCurrency(totalSum)}</span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Резервация действует <b>{durationLabel}</b>. По истечении деталь снова станет доступна.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={saving || items.length === 0}
            >
              {saving
                ? 'Резервирую...'
                : `Зарезервировать ${items.length > 1 ? `${items.length} дет.` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
