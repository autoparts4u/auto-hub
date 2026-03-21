'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface OrderStatus {
  id: number;
  name: string;
  hexColor: string;
}

interface DeliveryMethod {
  id: number;
  name: string;
  hexColor: string | null;
}

interface PurchaseStatus {
  id: number;
  name: string;
  hexColor: string;
}

interface OrderDefaultsPanelProps {
  orderStatuses: OrderStatus[];
  deliveryMethods: DeliveryMethod[];
}

export function OrderDefaultsPanel({ orderStatuses, deliveryMethods }: OrderDefaultsPanelProps) {
  const [defaultStatusId, setDefaultStatusId] = useState('none');
  const [defaultDeliveryMethodId, setDefaultDeliveryMethodId] = useState('none');
  const [defaultPurchaseStatusId, setDefaultPurchaseStatusId] = useState('none');
  const [purchaseStatuses, setPurchaseStatuses] = useState<PurchaseStatus[]>([]);
  const [saving, setSaving] = useState(false);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [usdRateOffset, setUsdRateOffset] = useState<string>('0');
  const [reservationDurationMinutes, setReservationDurationMinutes] = useState<string>('1440');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.defaultOrderStatusId) setDefaultStatusId(data.defaultOrderStatusId.toString());
        if (data.defaultDeliveryMethodId) setDefaultDeliveryMethodId(data.defaultDeliveryMethodId.toString());
        if (data.defaultPurchaseStatusId) setDefaultPurchaseStatusId(data.defaultPurchaseStatusId.toString());
        setUsdRateOffset((data.usdRateOffset ?? 0).toString());
        setReservationDurationMinutes((data.reservationDurationMinutes ?? 1440).toString());
      })
      .catch(() => {});
    fetch('/api/purchase-statuses')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPurchaseStatuses(data); })
      .catch(() => {});
    fetch('https://www.nbrb.by/api/exrates/rates/431')
      .then(r => r.json())
      .then(data => setUsdRate(data.Cur_OfficialRate ?? null))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultOrderStatusId: defaultStatusId !== 'none' ? parseInt(defaultStatusId) : null,
          defaultDeliveryMethodId: defaultDeliveryMethodId !== 'none' ? parseInt(defaultDeliveryMethodId) : null,
          defaultPurchaseStatusId: defaultPurchaseStatusId !== 'none' ? parseInt(defaultPurchaseStatusId) : null,
          usdRateOffset: parseFloat(usdRateOffset) || 0,
          reservationDurationMinutes: parseInt(reservationDurationMinutes) || 1440,
        }),
      });
      if (res.ok) {
        toast.success('Настройки сохранены');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label>Статус заказа по умолчанию</Label>
        <Select value={defaultStatusId} onValueChange={setDefaultStatusId}>
          <SelectTrigger>
            <SelectValue placeholder="Не выбрано" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не выбрано</SelectItem>
            {orderStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.hexColor }} />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Метод доставки по умолчанию</Label>
        <Select value={defaultDeliveryMethodId} onValueChange={setDefaultDeliveryMethodId}>
          <SelectTrigger>
            <SelectValue placeholder="Не выбрано" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не выбрано</SelectItem>
            {deliveryMethods.map((method) => (
              <SelectItem key={method.id} value={method.id.toString()}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Статус поступления по умолчанию</Label>
        <Select value={defaultPurchaseStatusId} onValueChange={setDefaultPurchaseStatusId}>
          <SelectTrigger>
            <SelectValue placeholder="Не выбрано" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не выбрано</SelectItem>
            {purchaseStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.hexColor }} />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
        <div className="text-sm font-medium">Курс USD (НБРБ)</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Текущий курс:</span>
          <span className="font-semibold">
            {usdRate !== null ? `${usdRate.toFixed(4)} BYN` : 'Загрузка...'}
          </span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="usd-offset">Надбавка к курсу (BYN)</Label>
          <Input
            id="usd-offset"
            type="text"
            inputMode="decimal"
            value={usdRateOffset}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || /^-?\d*\.?\d*$/.test(val)) setUsdRateOffset(val);
            }}
            onFocus={e => {
              if (usdRateOffset === '0') {
                setUsdRateOffset('');
              } else {
                e.target.select();
              }
            }}
            onBlur={() => {
              if (usdRateOffset === '' || usdRateOffset === '-') setUsdRateOffset('0');
            }}
            placeholder="0"
          />
        </div>
        {usdRate !== null && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Итоговый курс для пользователей:</span>
            <span className="font-semibold text-green-600 dark:text-green-500">
              {(usdRate + (parseFloat(usdRateOffset) || 0)).toFixed(4)} BYN
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
        <div className="text-sm font-medium">Резервирование</div>
        <div className="space-y-1.5">
          <Label htmlFor="reservation-duration">Длительность резервации (минут)</Label>
          <Input
            id="reservation-duration"
            type="text"
            inputMode="numeric"
            value={reservationDurationMinutes}
            onChange={e => {
              const val = e.target.value;
              if (val === '' || /^\d*$/.test(val)) setReservationDurationMinutes(val);
            }}
            onFocus={e => e.target.select()}
            onBlur={() => {
              if (reservationDurationMinutes === '' || parseInt(reservationDurationMinutes) < 1) {
                setReservationDurationMinutes('1440');
              }
            }}
            placeholder="1440"
          />
          <p className="text-xs text-muted-foreground">
            Через указанное время резервация автоматически отменяется (1440 мин = 24 ч)
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  );
}
