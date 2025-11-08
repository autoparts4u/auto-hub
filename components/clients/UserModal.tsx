'use client';

import { useState, useEffect } from 'react';
import { PriceType } from '@/app/types/orders';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: string;
  priceAccessId?: number | null;
  warehouseAccessId?: number | null;
  isConfirmed: boolean;
}

interface Warehouse {
  id: number;
  name: string;
}

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  priceTypes: PriceType[];
  warehouses: Warehouse[];
  user?: UserItem | null;
}

export default function UserModal({
  open,
  onClose,
  priceTypes,
  warehouses,
  user,
}: UserModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Поля формы
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('user');
  const [priceAccessId, setPriceAccessId] = useState<string>('none');
  const [warehouseAccessId, setWarehouseAccessId] = useState<string>('none');
  const [isConfirmed, setIsConfirmed] = useState(true);

  // Заполнение формы данными пользователя
  useEffect(() => {
    if (user && open) {
      console.log('UserModal useEffect - user:', user);
      console.log('UserModal useEffect - priceAccessId:', user.priceAccessId, 'type:', typeof user.priceAccessId);
      console.log('UserModal useEffect - warehouseAccessId:', user.warehouseAccessId, 'type:', typeof user.warehouseAccessId);
      
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setRole(user.role || 'user');
      
      const priceId = user.priceAccessId != null ? user.priceAccessId.toString() : 'none';
      const warehouseId = user.warehouseAccessId != null ? user.warehouseAccessId.toString() : 'none';
      
      console.log('UserModal useEffect - setting priceAccessId to:', priceId);
      console.log('UserModal useEffect - setting warehouseAccessId to:', warehouseId);
      console.log('UserModal useEffect - available priceTypes:', priceTypes.map(p => p.id.toString()));
      console.log('UserModal useEffect - available warehouses:', warehouses.map(w => w.id.toString()));
      
      setPriceAccessId(priceId);
      setWarehouseAccessId(warehouseId);
      setIsConfirmed(user.isConfirmed ?? true);
    } else if (!open) {
      // Очистка формы при закрытии
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setRole('user');
      setPriceAccessId('none');
      setWarehouseAccessId('none');
      setIsConfirmed(true);
    }
  }, [user, open, priceTypes, warehouses]);

  const handleClose = () => {
    // Очистка формы
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setRole('user');
    setPriceAccessId('none');
    setWarehouseAccessId('none');
    setIsConfirmed(true);
    onClose();
  };

  const handleSubmit = async () => {
    // Валидация
    if (!email.trim()) {
      toast.error('Укажите email');
      return;
    }

    if (!user) {
      toast.error('Пользователь не выбран');
      return;
    }

    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        email: email.trim(),
        role,
        isConfirmed,
      };

      // Добавляем опциональные поля только если они заполнены
      if (name.trim()) payload.name = name.trim();
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

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success('Пользователь успешно обновлен');
      handleClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Ошибка при обновлении пользователя'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
          <DialogDescription>
            Измените информацию о пользователе
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
                <Label htmlFor="name">Имя пользователя</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                />
                <p className="text-xs text-muted-foreground">
                  Отображаемое имя пользователя
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={!email ? 'border-orange-300' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  📧 Email для входа в систему
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
                📱 Контактный телефон
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
                Адрес пользователя
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
                <Label htmlFor="role">Роль</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  🛡️ Роль определяет уровень доступа
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmed" className="flex items-center gap-2">
                  <span>Подтвержден</span>
                  <Switch
                    id="confirmed"
                    checked={isConfirmed}
                    onCheckedChange={setIsConfirmed}
                  />
                </Label>
                <p className="text-xs text-muted-foreground pt-2">
                  ✓ Подтвержденный пользователь может входить в систему
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceType">Тип цены</Label>
              <Select value={priceAccessId} onValueChange={setPriceAccessId}>
                <SelectTrigger id="priceType">
                  <SelectValue placeholder="Выберите тип цены" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  {priceTypes.map((priceType) => {
                    console.log('PriceType item:', priceType.id, priceType.name, 'current value:', priceAccessId);
                    return (
                      <SelectItem
                        key={priceType.id}
                        value={priceType.id.toString()}
                      >
                        {priceType.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                💰 Тип цен для пользователя (текущее значение: {priceAccessId})
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">База данных</Label>
              <Select
                value={warehouseAccessId}
                onValueChange={setWarehouseAccessId}
              >
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Выберите базу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  {warehouses.map((warehouse) => {
                    console.log('Warehouse item:', warehouse.id, warehouse.name, 'current value:', warehouseAccessId);
                    return (
                      <SelectItem
                        key={warehouse.id}
                        value={warehouse.id.toString()}
                      >
                        {warehouse.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                🗄️ База данных для доступа (текущее значение: {warehouseAccessId})
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

