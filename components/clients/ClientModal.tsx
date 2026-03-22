'use client';

import { useState, useEffect } from 'react';
import { PriceType, Client, Warehouse } from '@/app/types/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { toast } from 'sonner';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  priceTypes: PriceType[];
  warehouses: Warehouse[];
  client?: Client | null;
  defaultReservationDuration?: number;
}

export default function ClientModal({
  open,
  onClose,
  priceTypes,
  warehouses,
  client,
  defaultReservationDuration = 1440,
}: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!client;
  
  // Поля формы
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [priceAccessId, setPriceAccessId] = useState<string>('');
  const [warehouseAccessId, setWarehouseAccessId] = useState<string>('');
  const [reservationDuration, setReservationDuration] = useState<string>('');

  // Заполнение формы при редактировании
  useEffect(() => {
    if (client && open) {
      setName(client.name || '');
      setFullName(client.fullName || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setPriceAccessId(client.priceAccessId?.toString() || '');
      setWarehouseAccessId(client.warehouseAccessId?.toString() || '');
      setReservationDuration(client.reservationDurationMinutes?.toString() || '');
    } else if (!open) {
      // Очистка формы при закрытии
      setName('');
      setFullName('');
      setPhone('');
      setAddress('');
      setPriceAccessId('');
      setWarehouseAccessId('');
      setReservationDuration('');
    }
  }, [client, open]);

  const handleClose = () => {
    // Очистка формы
    setName('');
    setFullName('');
    setPhone('');
    setAddress('');
    setPriceAccessId('');
    setWarehouseAccessId('');
    setReservationDuration('');
    onClose();
  };

  const handleSubmit = async () => {
    // Валидация
    if (!name.trim()) {
      toast.error('Укажите краткое название');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Укажите полное название');
      return;
    }

    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        fullName: fullName.trim(),
      };

      // Добавляем опциональные поля только если они заполнены
      if (phone.trim()) payload.phone = phone.trim();
      if (address.trim()) payload.address = address.trim();
      if (priceAccessId && priceAccessId !== 'none') {
        payload.priceAccessId = parseInt(priceAccessId);
      } else {
        payload.priceAccessId = null;
      }
      if (warehouseAccessId && warehouseAccessId !== 'none') {
        payload.warehouseAccessId = parseInt(warehouseAccessId);
      } else {
        payload.warehouseAccessId = null;
      }
      const parsedDuration = parseInt(reservationDuration);
      payload.reservationDurationMinutes =
        reservationDuration.trim() && parsedDuration > 0 ? parsedDuration : null;

      const url = isEditMode ? `/api/clients/${client!.id}` : '/api/clients';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} client`);
      }

      toast.success(isEditMode ? 'Клиент успешно обновлен' : 'Клиент успешно создан');
      handleClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} client:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Ошибка при ${isEditMode ? 'обновлении' : 'создании'} клиента`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Редактировать клиента' : 'Добавить нового клиента'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Измените информацию о клиенте'
              : 'Создайте нового клиента. Позже его можно будет связать с зарегистрированным пользователем.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              ОСНОВНАЯ ИНФОРМАЦИЯ
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Краткое название <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ООО Автосервис"
                  className={!name ? 'border-orange-300' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Используется для быстрого поиска
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Полное название <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Общество с ограниченной ответственностью Автосервис"
                  className={!fullName ? 'border-orange-300' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Полное юридическое название
                </p>
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              КОНТАКТНАЯ ИНФОРМАЦИЯ
            </h3>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380501234567"
              />
              <p className="text-xs text-muted-foreground">
                📱 Основной контактный номер
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ул. Главная, д. 123, офис 456"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Адрес для доставки (можно изменить при создании заказа)
              </p>
            </div>
          </div>

          {/* Настройки доступа */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              НАСТРОЙКИ ДОСТУПА
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceType">Тип цены</Label>
                <Select
                  value={priceAccessId}
                  onValueChange={setPriceAccessId}
                >
                  <SelectTrigger id="priceType">
                    <SelectValue placeholder="Выберите тип цены" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указан</SelectItem>
                    {priceTypes.map((priceType) => (
                      <SelectItem
                        key={priceType.id}
                        value={priceType.id.toString()}
                      >
                        {priceType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💰 Цены для этого клиента
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Склад</Label>
                <Select
                  value={warehouseAccessId}
                  onValueChange={setWarehouseAccessId}
                >
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="Выберите склад" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указан</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem
                        key={warehouse.id}
                        value={warehouse.id.toString()}
                      >
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  🏪 Доступный склад
                </p>
              </div>
            </div>
          </div>

          {/* Время резервации */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              БРОНИРОВАНИЕ
            </h3>
            <div className="space-y-2">
              <Label htmlFor="reservationDuration">Время резервации (минуты)</Label>
              <Input
                id="reservationDuration"
                type="number"
                inputMode="numeric"
                min={1}
                value={reservationDuration}
                onChange={(e) => setReservationDuration(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={`По умолчанию: ${defaultReservationDuration} мин. (${Math.round(defaultReservationDuration / 60)} ч.)`}
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым, чтобы использовать глобальное значение из настроек
              </p>
            </div>
          </div>

          {/* Информационное сообщение (только для создания) */}
          {!isEditMode && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">ℹ️ Что дальше?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Клиент создан без авторизации (может работать по телефону)</li>
                <li>• Вы можете создавать заказы для этого клиента</li>
                <li>• Когда клиент зарегистрируется, его можно будет связать с пользователем</li>
                <li>• После связывания клиент сможет видеть свои заказы в системе</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading 
              ? (isEditMode ? 'Сохранение...' : 'Создание...') 
              : (isEditMode ? 'Сохранить изменения' : 'Создать клиента')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

