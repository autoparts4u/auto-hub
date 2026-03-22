'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Warehouse {
  id: number;
  name: string;
}

interface ReservationItem {
  id: string;
  quantity: number;
  notes: string | null;
  autopart: { id: string; article: string; description: string };
  warehouse: { id: number; name: string } | null;
}

interface Props {
  clientName: string;
  reservations: ReservationItem[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientBulkOrderModal({
  clientName,
  reservations,
  warehouses,
  onClose,
  onSuccess,
}: Props) {
  const [warehouseSelections, setWarehouseSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    reservations.forEach((r) => {
      if (r.warehouse?.id) initial[r.id] = String(r.warehouse.id);
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const allHaveWarehouses = reservations.every((r) => !!warehouseSelections[r.id]);

  const handleAssignWarehouse = async (reservationId: string, warehouseId: string) => {
    setWarehouseSelections((prev) => ({ ...prev, [reservationId]: warehouseId }));
    try {
      await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId: parseInt(warehouseId) }),
      });
    } catch {
      // Склад сохранится при создании заказа
    }
  };

  const handleCreateOrder = async () => {
    if (!allHaveWarehouses) return;

    // Сначала синхронизируем склады для всех резерваций
    const patchPromises = reservations.map((r) =>
      fetch(`/api/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId: parseInt(warehouseSelections[r.id]) }),
      })
    );
    await Promise.all(patchPromises);

    setSaving(true);
    try {
      const res = await fetch('/api/reservations/bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationIds: reservations.map((r) => r.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Ошибка создания заказа');
        return;
      }
      toast.success(`Заказ создан для ${clientName}`);
      onSuccess();
    } catch {
      toast.error('Ошибка создания заказа');
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
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Создать заказ по бронированиям
          </DialogTitle>
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">{clientName}</span>
            <span>·</span>
            <span>
              {reservations.length}{' '}
              {reservations.length === 1
                ? 'позиция'
                : reservations.length < 5
                  ? 'позиции'
                  : 'позиций'}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="border rounded-lg px-3 py-2.5 bg-muted/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold text-sm">{r.autopart.article}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.autopart.description}
                  </div>
                  {r.notes && (
                    <div className="text-xs text-muted-foreground italic">{r.notes}</div>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {r.quantity} шт.
                </span>
              </div>
              <Select
                value={warehouseSelections[r.id] ?? ''}
                onValueChange={(val) => handleAssignWarehouse(r.id, val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Выбрать склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)} className="text-xs">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={handleCreateOrder}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving || !allHaveWarehouses}
          >
            {saving ? 'Создаю заказ...' : !allHaveWarehouses ? 'Укажите склады' : 'Создать заказ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
