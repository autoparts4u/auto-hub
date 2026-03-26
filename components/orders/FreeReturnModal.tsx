'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  fullName: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface FreeReturnItem {
  article: string;
  description: string;
  quantity: number;
  warehouse_id: number | '';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyItem = (): FreeReturnItem => ({
  article: '',
  description: '',
  quantity: 1,
  warehouse_id: '',
});

export default function FreeReturnModal({ open, onClose, onSuccess }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clientId, setClientId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<FreeReturnItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/clients').then((r) => r.json()).catch(() => []),
      fetch('/api/warehouses').then((r) => r.json()).catch(() => []),
    ]).then(([c, w]) => {
      setClients(c);
      setWarehouses(w);
    });
  }, [open]);

  const updateItem = (idx: number, field: keyof FreeReturnItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const isValid = items.every(
    (it) => it.article.trim() && it.description.trim() && it.quantity > 0 && it.warehouse_id !== ''
  );

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('Заполните все поля позиций');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId && clientId !== 'none' ? clientId : undefined,
          reason: reason || undefined,
          items: items.map((it) => ({
            article: it.article.trim(),
            description: it.description.trim(),
            quantity: it.quantity,
            warehouse_id: it.warehouse_id,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Возврат создан');
        onSuccess();
        handleClose();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка создания возврата');
      }
    } catch {
      toast.error('Ошибка создания возврата');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setClientId('');
    setReason('');
    setItems([emptyItem()]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Произвольный возврат</DialogTitle>
          <DialogDescription>
            Возврат без привязки к заказу — для случаев когда заказ не был оформлен в системе
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Клиент (необязательно) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Клиент <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Без клиента —</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="text-muted-foreground text-xs">({c.fullName})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Причина <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Причина возврата..."
                rows={2}
              />
            </div>
          </div>

          {/* Позиции */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Позиции</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Добавить позицию
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Артикул</Label>
                    <Input
                      value={item.article}
                      onChange={(e) => updateItem(idx, 'article', e.target.value)}
                      placeholder="ABC-123"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Склад</Label>
                    <Select
                      value={item.warehouse_id === '' ? '' : String(item.warehouse_id)}
                      onValueChange={(v) => updateItem(idx, 'warehouse_id', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Склад..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Описание</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Название детали"
                    />
                  </div>
                  <div className="space-y-1 w-24">
                    <Label className="text-xs">Кол-во</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="text-center"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !isValid} className="w-full">
            {submitting ? 'Создание...' : 'Создать возврат'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
