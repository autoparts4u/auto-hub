'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Ban, Clock, Package, MapPin, User } from 'lucide-react';

export interface ReservationDetails {
  id: string;
  quantity: number;
  status: 'active' | 'cancelled' | 'expired' | 'converted';
  expiresAt: Date | string;
  reservedAt?: Date | string;
  notes?: string | null;
  client?: { id: string; name: string; phone?: string | null } | null;
  autopart?: { id: string; article: string; description: string } | null;
  warehouse?: { id: number; name: string } | null;
}

const dateTime = (d: Date | string) =>
  new Date(d).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const minutesUntil = (iso: Date | string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'истекла';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `через ${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `через ${h}ч ${m}м`;
};

const statusLabel: Record<ReservationDetails['status'], string> = {
  active: 'активна',
  cancelled: 'отменена',
  expired: 'истекла',
  converted: 'в заказе',
};

export default function ReservationDetailsModal({
  reservation,
  onClose,
  onChanged,
}: {
  reservation: ReservationDetails;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Отменить эту резервацию?')) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/reservations/${reservation.id}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast.success('Резервация отменена');
        onChanged?.();
        onClose();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error?.error || 'Ошибка отмены');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка отмены');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Резервация</DialogTitle>
          <DialogDescription>#{reservation.id.slice(-8)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <Badge variant={reservation.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel[reservation.status]}
            </Badge>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-muted-foreground">
                <Clock className="size-3.5" />
                {minutesUntil(reservation.expiresAt)}
              </div>
              <div className="text-xs text-muted-foreground">до {dateTime(reservation.expiresAt)}</div>
            </div>
          </div>

          <Separator />

          {reservation.autopart && (
            <div className="flex items-start gap-2">
              <Package className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{reservation.autopart.article}</div>
                <div className="truncate text-muted-foreground">{reservation.autopart.description}</div>
                <div className="mt-1 text-xs text-muted-foreground">{reservation.quantity} шт</div>
              </div>
            </div>
          )}

          {reservation.client && (
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{reservation.client.name}</div>
                {reservation.client.phone && (
                  <div className="text-muted-foreground">{reservation.client.phone}</div>
                )}
              </div>
            </div>
          )}

          {reservation.warehouse && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>{reservation.warehouse.name}</div>
            </div>
          )}

          {reservation.notes && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground">
              {reservation.notes}
            </div>
          )}
        </div>

        {reservation.status === 'active' && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              <Ban className="mr-1 size-3.5" />
              {cancelling ? 'Отменяем…' : 'Отменить'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
