'use client';

import { useState, useEffect } from 'react';
import { Order } from '@/app/types/orders';
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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addPartialPayment,
  markOrderAsFullyPaid,
} from '@/lib/actions/orderPaymentActions';
import {
  calculateOrderTotal,
  calculateRemainingAmount,
  isOrderFullyPaid,
} from '@/lib/utils/orderPaymentUtils';

interface OrderPaymentModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onPaymentUpdate: () => void;
}

export default function OrderPaymentModal({
  open,
  onClose,
  orderId,
  onPaymentUpdate,
}: OrderPaymentModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Ошибка загрузки данных заказа');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    if (!order) return;

    const remaining = calculateRemainingAmount(
      order.totalAmount,
      order.discount,
      order.paidAmount || 0
    );

    if (amount > remaining) {
      toast.error(`Сумма превышает остаток к оплате (${remaining.toFixed(2)})`);
      return;
    }

    setAddingPayment(true);
    try {
      const result = await addPartialPayment(orderId, amount);

      if (result.success) {
        toast.success('Платеж добавлен успешно');
        setPaymentAmount('');
        await fetchOrderDetails();
        onPaymentUpdate();
      } else {
        toast.error(result.error || 'Ошибка добавления платежа');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Ошибка добавления платежа');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleMarkFullyPaid = async () => {
    if (!order) return;

    const confirmed = window.confirm(
      'Отметить заказ как полностью оплаченный?'
    );
    if (!confirmed) return;

    setAddingPayment(true);
    try {
      const result = await markOrderAsFullyPaid(orderId);

      if (result.success) {
        toast.success('Заказ отмечен как полностью оплаченный');
        await fetchOrderDetails();
        onPaymentUpdate();
      } else {
        toast.error(result.error || 'Ошибка обновления статуса оплаты');
      }
    } catch (error) {
      console.error('Error marking as fully paid:', error);
      toast.error('Ошибка обновления статуса оплаты');
    } finally {
      setAddingPayment(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Загрузка...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return null;
  }

  const total = calculateOrderTotal(order.totalAmount, order.discount);
  const remaining = calculateRemainingAmount(
    order.totalAmount,
    order.discount,
    order.paidAmount || 0
  );
  const fullyPaid = isOrderFullyPaid(
    order.totalAmount,
    order.discount,
    order.paidAmount || 0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Оплата заказа #{orderId.slice(-8)}
          </DialogTitle>
          <DialogDescription>
            Управление оплатой и добавление частичных платежей
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о клиенте */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Клиент</p>
                <p className="font-medium">{order.client?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Дата создания</p>
                <p className="font-medium">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Детали оплаты */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Информация об оплате
            </h3>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Сумма заказа:
                </span>
                <span className="font-medium">
                  {(order.totalAmount || 0).toFixed(2)}
                </span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Скидка:</span>
                  <span className="font-medium text-green-600">
                    -{order.discount.toFixed(2)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium">К оплате:</span>
                <span className="text-lg font-bold">{total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Оплачено:</span>
                <span
                  className={`font-medium ${
                    fullyPaid ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {(order.paidAmount || 0).toFixed(2)}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium">Остаток:</span>
                <span
                  className={`text-lg font-bold ${
                    fullyPaid ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {remaining.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Статус оплаты */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
              {fullyPaid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <Badge variant="default" className="bg-green-600">
                    Полностью оплачено
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <Badge variant="default" className="bg-orange-600">
                    Частично оплачено
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Форма добавления платежа */}
          {!fullyPaid && (
            <>
              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Добавить платеж</h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="payment-amount">Сумма платежа</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={remaining}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onFocus={(e) => {
                        if (e.target.value === '0') {
                          setPaymentAmount('');
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          setPaymentAmount('0');
                        }
                      }}
                      placeholder={`Максимум: ${remaining.toFixed(2)}`}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddPayment}
                      disabled={addingPayment || !paymentAmount || paymentAmount === '0'}
                      className="flex-1"
                    >
                      {addingPayment ? 'Добавление...' : 'Добавить платеж'}
                    </Button>

                    <Button
                      onClick={handleMarkFullyPaid}
                      disabled={addingPayment}
                      variant="outline"
                      className="flex-1"
                    >
                      Оплачено полностью
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Введите сумму платежа или отметьте заказ как полностью
                    оплаченный
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Информация о датах оплаты */}
          {order.paidAt && (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  Дата полной оплаты:
                </p>
                <p className="font-medium">{formatDate(order.paidAt)}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
