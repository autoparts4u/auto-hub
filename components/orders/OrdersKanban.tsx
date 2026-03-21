'use client';

import { useState, useRef } from 'react';
import { Order, OrderStatus } from '@/app/types/orders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Trash2,
  Package,
  Truck,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { getContrastTextColor } from '@/lib/utils';
import { toast } from 'sonner';

interface OrdersKanbanProps {
  orders: Order[];
  statuses: OrderStatus[];
  onViewDetails: (order: Order) => void;
  onOpenPayment: (order: Order) => void;
  onOpenEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  formatCurrency: (amount: number | null) => string;
  formatDate: (date: Date | string) => string;
  onOrderStatusChange: (orderId: string, newStatusId: number) => void;
}

export default function OrdersKanban({
  orders,
  statuses,
  onViewDetails,
  onOpenPayment,
  onOpenEdit,
  onDelete,
  formatCurrency,
  formatDate,
  onOrderStatusChange,
}: OrdersKanbanProps) {
  const sortedStatuses = [...statuses].sort((a, b) => a.id - b.id);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatusId, setOverStatusId] = useState<number | null>(null);
  const dragOrder = useRef<Order | null>(null);

  const ordersByStatus = (statusId: number) =>
    orders.filter((order) => order.orderStatus_id === statusId);

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    dragOrder.current = order;
    setDraggingId(order.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverStatusId(null);
    dragOrder.current = null;
  };

  const handleDragOver = (e: React.DragEvent, statusId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverStatusId(statusId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: number) => {
    e.preventDefault();
    setOverStatusId(null);
    setDraggingId(null); // сбрасываем сразу, до перемонтирования карточки

    const order = dragOrder.current;
    dragOrder.current = null;
    if (!order || order.orderStatus_id === targetStatusId) return;

    // Оптимистичное обновление
    onOrderStatusChange(order.id, targetStatusId);

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus_id: targetStatusId }),
      });

      if (!res.ok) {
        // Откатываем при ошибке
        onOrderStatusChange(order.id, order.orderStatus_id);
        toast.error('Ошибка обновления статуса');
      }
    } catch {
      onOrderStatusChange(order.id, order.orderStatus_id);
      toast.error('Ошибка обновления статуса');
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {sortedStatuses.map((status) => {
          const columnOrders = ordersByStatus(status.id);
          const textColor = getContrastTextColor(status.hexColor);
          const isOver = overStatusId === status.id;

          return (
            <div
              key={status.id}
              className={`flex flex-col rounded-lg min-w-[280px] w-[280px] transition-colors ${
                isOver ? 'bg-muted/60 ring-2 ring-primary/40' : 'bg-muted/30'
              }`}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDragLeave={() => setOverStatusId(null)}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-t-lg"
                style={{ backgroundColor: status.hexColor }}
              >
                <span className="font-semibold text-sm truncate" style={{ color: textColor }}>
                  {status.name}
                </span>
                <span
                  className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${textColor}22`, color: textColor }}
                >
                  {columnOrders.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
                {columnOrders.length === 0 ? (
                  <div className={`text-center text-xs py-6 transition-colors ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isOver ? 'Отпустите здесь' : 'Нет заказов'}
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const isDragging = draggingId === order.id;
                    return (
                      <div
                        key={order.id}
                        draggable={!order.orderStatus?.isLast}
                        onDragStart={(e) => handleDragStart(e, order)}
                        onDragEnd={handleDragEnd}
                        className={`bg-card border rounded-lg shadow-sm transition-all ${
                          order.orderStatus?.isLast
                            ? 'cursor-default'
                            : isDragging
                              ? 'opacity-40 scale-95 cursor-grabbing'
                              : 'cursor-grab hover:shadow-md'
                        }`}
                        onClick={() => !isDragging && onViewDetails(order)}
                      >
                        <div className="p-3 space-y-2">
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs text-muted-foreground">
                              № {order.id.substring(0, 8)}
                            </div>
                            <div className="font-semibold text-sm leading-tight truncate" title={order.client?.name}>
                              {order.client?.name}
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(order.totalAmount)}
                            </div>
                            {(order.paidAmount || 0) > 0 && (
                              <div className={`text-xs ${
                                (order.paidAmount || 0) >= (order.totalAmount || 0) - order.discount
                                  ? 'text-green-600'
                                  : 'text-orange-600'
                              }`}>
                                Оплачено: {formatCurrency(order.paidAmount || 0)}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              <Package className="h-3 w-3 mr-1" />
                              {order.orderItems?.length || 0}
                            </Badge>
                            {order.deliveryMethod && (
                              <Badge
                                variant="outline"
                                className="text-xs h-5 px-1.5"
                                style={{
                                  borderColor: order.deliveryMethod.hexColor || undefined,
                                  color: order.deliveryMethod.hexColor || undefined,
                                }}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                {order.deliveryMethod.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        <div
                          className="flex items-center justify-end gap-1 px-2 py-1.5 border-t bg-muted/30 rounded-b-lg"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenEdit(order)} title="Редактировать">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenPayment(order)} title="Оплата">
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(order.id)} title="Удалить">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
