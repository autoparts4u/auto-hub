'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AutopartWithStock } from '@/app/types/autoparts';
import { Clock, Package } from 'lucide-react';

interface Props {
  part: AutopartWithStock;
  warehouseAccessId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ part, warehouseAccessId, onClose, onSuccess }: Props) {
  const availableWarehouses = part.warehouses.filter(w => {
    if (warehouseAccessId) return w.warehouseId === warehouseAccessId && w.quantity > 0;
    return w.quantity > 0;
  });

  const totalAvailable = availableWarehouses.reduce((sum, w) => sum + w.quantity, 0);

  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setDurationMinutes(data.reservationDurationMinutes ?? 1440))
      .catch(() => setDurationMinutes(1440));
  }, []);

  const durationLabel = durationMinutes === null
    ? '...'
    : durationMinutes >= 60
      ? `${Math.round(durationMinutes / 60)} ч.`
      : `${durationMinutes} мин.`;

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      toast.error('Укажите корректное количество');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autopartId: part.id,
          quantity: qty,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Ошибка при создании резервации');
        return;
      }

      const { reservation } = data;
      const expiresAt = new Date(reservation.expiresAt);
      const formatted = expiresAt.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      toast.success(
        `Деталь зарезервирована до ${formatted} (${durationLabel})`,
        { duration: 6000 }
      );
      onSuccess();
    } catch {
      toast.error('Ошибка при создании резервации');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Зарезервировать деталь</DialogTitle>

        <div className="space-y-4">
          {/* Информация о детали */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm font-semibold">{part.article}</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{part.description}</p>
          </div>

          {availableWarehouses.length === 0 ? (
            <p className="text-sm text-destructive text-center py-4">
              Товар отсутствует в наличии
            </p>
          ) : (
            <>
              {/* Общее наличие */}
              <div className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">В наличии</span>
                <span className="font-semibold text-primary">{totalAvailable} шт.</span>
              </div>

              {/* Количество */}
              <div className="space-y-1.5">
                <Label htmlFor="res-qty">Количество</Label>
                <Input
                  id="res-qty"
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*$/.test(val)) setQuantity(val);
                  }}
                  onBlur={() => {
                    const n = parseInt(quantity);
                    if (!n || n < 1) setQuantity('1');
                    else if (n > totalAvailable) setQuantity(String(totalAvailable));
                  }}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">Максимум: {totalAvailable}</p>
              </div>

              {/* Примечание */}
              <div className="space-y-1.5">
                <Label htmlFor="res-notes">Примечание (необязательно)</Label>
                <Input
                  id="res-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Причина резервации, контактные данные..."
                  maxLength={200}
                />
              </div>

              {/* Подсказка о времени */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Резервация действует <b>{durationLabel}</b>. По истечении этого времени деталь снова станет доступна.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={saving}>
                  {saving ? 'Резервирую...' : 'Зарезервировать'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
