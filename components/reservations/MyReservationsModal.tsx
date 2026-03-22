'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ban, Clock } from 'lucide-react';

type ReservationStatus = 'active' | 'cancelled' | 'expired' | 'converted';

interface Reservation {
  id: string;
  status: ReservationStatus;
  quantity: number;
  notes: string | null;
  reservedAt: string;
  expiresAt: string;
  autopart: { id: string; article: string; description: string };
  warehouse: { id: number; name: string } | null;
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  active: 'Активна',
  cancelled: 'Отменена',
  expired: 'Истекла',
  converted: 'В заказе',
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
  converted: 'bg-blue-100 text-blue-700',
};

interface Props {
  onClose: () => void;
}

export function MyReservationsModal({ onClose }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations');
      if (!res.ok) throw new Error();
      setReservations(await res.json());
    } catch {
      toast.error('Ошибка загрузки резерваций');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Ошибка отмены');
        return;
      }
      toast.success('Резервация отменена');
      fetchReservations();
    } catch {
      toast.error('Ошибка отмены');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours} ч. ${minutes} мин.`;
    return `${minutes} мин.`;
  };

  const active = reservations.filter(r => r.status === 'active');
  const past = reservations.filter(r => r.status !== 'active');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle>Мои бронирования</DialogTitle>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            У вас нет бронирований
          </div>
        ) : (
          <div className="space-y-5">
            {active.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Активные
                </h3>
                {active.map(r => {
                  const timeLeft = getTimeLeft(r.expiresAt);
                  return (
                    <div key={r.id} className="border rounded-lg p-3 space-y-2 bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-mono font-semibold text-sm">{r.autopart.article}</div>
                          <div className="text-xs text-muted-foreground">{r.autopart.description}</div>
                        </div>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {r.warehouse && <span>Склад: <b className="text-foreground">{r.warehouse.name}</b></span>}
                        <span>Кол-во: <b className="text-primary">{r.quantity} шт.</b></span>
                      </div>

                      {timeLeft && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Осталось: <b>{timeLeft}</b> (до {formatDate(r.expiresAt)})</span>
                        </div>
                      )}

                      {r.notes && (
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                          {r.notes}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 h-8"
                        disabled={cancellingId === r.id}
                        onClick={() => handleCancel(r.id)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" />
                        Отменить
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  История
                </h3>
                {past.map(r => (
                  <div key={r.id} className="border rounded-lg p-3 space-y-1 opacity-70">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-mono text-sm font-semibold">{r.autopart.article}</div>
                        <div className="text-xs text-muted-foreground">{r.autopart.description}</div>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.quantity} шт. · {formatDate(r.reservedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
