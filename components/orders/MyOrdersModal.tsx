'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';

interface OrderItem {
  id: number;
  article: string;
  description: string;
  quantity: number;
  item_final_price: number;
}

interface Order {
  id: string;
  createdAt: string;
  totalAmount: number | null;
  discount: number;
  paidAmount: number;
  notes: string | null;
  orderStatus: { id: number; name: string; hexColor: string | null; isLast: boolean };
  orderItems: OrderItem[];
}

interface Props {
  onClose: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function MyOrdersModal({ onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/my');
      if (!res.ok) throw new Error();
      const data: Order[] = await res.json();
      setOrders(data);
      // Автоматически раскрываем первый заказ
      if (data.length > 0) setExpandedId(data[0].id);
    } catch {
      toast.error('Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Мои заказы
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Загрузка...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              У вас пока нет заказов
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const itemsTotal = order.orderItems.reduce(
                  (sum, i) => sum + i.item_final_price * i.quantity,
                  0
                );
                const total = order.totalAmount ?? itemsTotal;
                const hasPrices = order.orderItems.some((i) => i.item_final_price > 0);

                return (
                  <div key={order.id} className="border rounded-lg overflow-hidden">
                    {/* Order header — clickable */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {order.orderStatus.hexColor && (
                          <span
                            className="shrink-0 w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: order.orderStatus.hexColor }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">
                            {order.orderStatus.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            от {formatDate(order.createdAt)} ·{' '}
                            {order.orderItems.length}{' '}
                            {order.orderItems.length === 1
                              ? 'позиция'
                              : order.orderItems.length < 5
                                ? 'позиции'
                                : 'позиций'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {hasPrices && (
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(total)}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Order items */}
                    {isExpanded && (
                      <div className="divide-y">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-mono text-xs font-semibold">{item.article}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-xs font-semibold text-primary">
                                {item.quantity} шт.
                              </div>
                              {item.item_final_price > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(item.item_final_price)} / шт.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Footer: total + notes */}
                        <div className="px-4 py-2.5 bg-muted/20 space-y-1.5">
                          {hasPrices && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Итого:</span>
                              <span className="font-semibold text-primary">
                                {formatCurrency(total)}
                              </span>
                            </div>
                          )}
                          {order.paidAmount > 0 && (
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Оплачено:</span>
                              <span>{formatCurrency(order.paidAmount)}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="text-xs text-muted-foreground italic border-t pt-1.5 mt-1.5">
                              {order.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
