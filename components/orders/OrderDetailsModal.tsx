'use client';

import { useState, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  OrderStatusHistoryItem,
  UpdateOrderStatusDTO,
} from '@/app/types/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Truck,
  Calendar,
  DollarSign,
  User,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  statuses: OrderStatus[];
}

export default function OrderDetailsModal({
  open,
  onClose,
  orderId,
  statuses,
}: OrderDetailsModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [newStatusId, setNewStatusId] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setNewStatusId(data.orderStatus_id.toString());
      } else {
        toast.error('Ошибка загрузки заказа');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatusId) {
      toast.error('Выберите новый статус');
      return;
    }

    if (newStatusId === order?.orderStatus_id.toString()) {
      toast.error('Выберите другой статус');
      return;
    }

    try {
      setUpdatingStatus(true);

      const updateData: UpdateOrderStatusDTO = {
        orderStatus_id: parseInt(newStatusId),
        comment,
      };

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success('Статус успешно обновлен');
        setComment('');
        fetchOrderDetails();
        fetchHistory();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status?: OrderStatus) => {
    if (!status) return null;
    return (
      <Badge
        style={{
          backgroundColor: status.hexColor,
          color: '#fff',
        }}
      >
        {status.name}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Детали заказа</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            Загрузка...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали заказа #{order.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Информация о заказе и история изменений
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Клиент</div>
                  <div className="text-sm">{order.client?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.client?.fullName}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Создан</div>
                  <div className="text-sm">{formatDate(order.createdAt)}</div>
                  {order.user && (
                    <div className="text-xs text-muted-foreground">
                      Менеджер: {order.user.name || order.user.email}
                    </div>
                  )}
                </div>
              </div>

              {order.deliveryMethod && (
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Доставка</div>
                    <div className="text-sm">{order.deliveryMethod.name}</div>
                    {order.trackingNumber && (
                      <div className="text-xs text-muted-foreground">
                        ТТН: {order.trackingNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {order.deliveryAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Адрес доставки</div>
                    <div className="text-sm">{order.deliveryAddress}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Статус</div>
                  <div className="mt-1">{getStatusBadge(order.orderStatus)}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Сумма заказа</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  {order.discount > 0 && (
                    <div className="text-xs text-green-600">
                      Скидка: -{formatCurrency(order.discount)}
                    </div>
                  )}
                </div>
              </div>

              {order.issuedAt && (
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Выдан</div>
                    <div className="text-sm">{formatDate(order.issuedAt)}</div>
                  </div>
                </div>
              )}

              {order.paidAt && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Оплачен</div>
                    <div className="text-sm">{formatDate(order.paidAt)}</div>
                  </div>
                </div>
              )}

              {order.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Примечания</div>
                    <div className="text-sm text-muted-foreground">
                      {order.notes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Позиции заказа */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Позиции заказа ({order.orderItems?.length || 0})
            </h3>
            <div className="space-y-2">
              {order.orderItems?.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{item.article}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                      {item.autopart?.brand && (
                        <div className="text-xs text-muted-foreground">
                          Бренд: {item.autopart.brand.name}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(item.item_final_price * item.quantity)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.item_final_price)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Склад: {item.warehouse?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Изменение статуса */}
          {!order.orderStatus?.isLast && (
            <div className="space-y-3">
              <h3 className="font-semibold">Изменить статус</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Новый статус</Label>
                  <Select
                    value={newStatusId}
                    onValueChange={setNewStatusId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem
                          key={status.id}
                          value={status.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.hexColor }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Комментарий</Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Дополнительная информация..."
                    rows={2}
                  />
                </div>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={updatingStatus || newStatusId === order.orderStatus_id.toString()}
                className="w-full"
              >
                {updatingStatus ? 'Обновление...' : 'Обновить статус'}
              </Button>
            </div>
          )}

          <Separator />

          {/* История статусов */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              История изменений ({history.length})
            </h3>
            <div className="space-y-3">
              {history.map((item, index) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        backgroundColor: item.orderStatus?.hexColor,
                        borderColor: item.orderStatus?.hexColor,
                      }}
                    />
                    {index < history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      {item.orderStatus && getStatusBadge(item.orderStatus)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.user && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.user.name || item.user.email}
                      </div>
                    )}
                    {item.comment && (
                      <div className="text-sm mt-1">{item.comment}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

