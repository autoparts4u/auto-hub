'use client';

import { useState } from 'react';
import { Order, CreateReturnDTO } from '@/app/types/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ReturnModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onSuccess: () => void;
}

export default function ReturnModal({ open, onClose, order, onSuccess }: ReturnModalProps) {
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleQuantityChange = (itemId: number, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [itemId]: num }));
  };

  const selectedItems = (order.orderItems || []).filter(
    (item) => (quantities[item.id] || 0) > 0
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Выберите хотя бы одну позицию для возврата');
      return;
    }

    try {
      setSubmitting(true);
      const dto: CreateReturnDTO = {
        order_id: order.id,
        reason: reason || undefined,
        items: selectedItems.map((item) => ({
          order_item_id: item.id,
          quantity: quantities[item.id],
        })),
      };

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (res.ok) {
        toast.success('Возврат создан');
        onSuccess();
        onClose();
        setReason('');
        setQuantities({});
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ошибка создания возврата');
      }
    } catch {
      toast.error('Ошибка создания возврата');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать возврат</DialogTitle>
          <DialogDescription>
            Заказ #{order.id.substring(0, 8)} — выберите позиции и укажите количество для возврата
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Причина возврата</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Опишите причину возврата..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Позиции заказа</Label>
            <div className="space-y-2">
              {(order.orderItems || []).map((item) => (
                <div key={item.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold">{item.article}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                    <div className="text-xs text-muted-foreground">
                      В заказе: {item.quantity} шт.
                    </div>
                  </div>
                  <div className="shrink-0 w-24">
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={quantities[item.id] || 0}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
            className="w-full"
          >
            {submitting ? 'Создание...' : 'Создать возврат'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
