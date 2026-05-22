'use client';

import { useState } from 'react';
import { PurchaseOrder, PurchaseStatus } from '@/app/types/purchases';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Pencil, Package } from 'lucide-react';
import { getContrastTextColor } from '@/lib/utils';

const defaultFormatDate = (d: string) =>
  new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const defaultFormatCurrency = (v: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

export default function PurchaseDetailsModal({
  purchase,
  statuses,
  onClose,
  onStatusChange,
  onEdit,
  formatDate = defaultFormatDate,
  formatCurrency = defaultFormatCurrency,
}: {
  purchase: PurchaseOrder;
  statuses: PurchaseStatus[];
  onClose: () => void;
  onStatusChange: (statusId: number) => void;
  onEdit?: () => void;
  formatDate?: (d: string) => string;
  formatCurrency?: (v: number) => string;
}) {
  const [selectedStatusId, setSelectedStatusId] = useState(purchase.purchaseStatus_id.toString());
  const availableStatuses = statuses.filter(() => !purchase.purchaseStatus.isLast);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Поступление от {purchase.supplier.name}</DialogTitle>
              <DialogDescription>Заказ от {formatDate(purchase.orderedAt)}</DialogDescription>
            </div>
            {onEdit && !purchase.purchaseStatus.isLast && (
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-shrink-0">
                <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Изменить</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Поставщик</div>
              <div className="font-medium">{purchase.supplier.name}</div>
              {purchase.supplier.phone && <div className="text-muted-foreground">{purchase.supplier.phone}</div>}
              {purchase.supplier.contactPerson && (
                <div className="text-muted-foreground">{purchase.supplier.contactPerson}</div>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-muted-foreground mb-1">Статус</div>
                <Badge
                  style={{
                    backgroundColor: purchase.purchaseStatus.hexColor,
                    color: getContrastTextColor(purchase.purchaseStatus.hexColor),
                  }}
                >
                  {purchase.purchaseStatus.name}
                </Badge>
              </div>
              {purchase.expectedAt && (
                <div>
                  <div className="text-muted-foreground">Ожидается</div>
                  <div
                    className={
                      !purchase.receivedAt && new Date(purchase.expectedAt) < new Date()
                        ? 'font-medium text-destructive'
                        : 'font-medium'
                    }
                  >
                    {formatDate(purchase.expectedAt)}
                  </div>
                </div>
              )}
              {purchase.receivedAt && (
                <div>
                  <div className="text-muted-foreground">Получено</div>
                  <div className="font-medium">{formatDate(purchase.receivedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {purchase.notes && (
            <div className="text-sm">
              <div className="text-muted-foreground mb-1">Примечания</div>
              <div className="bg-muted/30 rounded-md px-3 py-2">{purchase.notes}</div>
            </div>
          )}

          {/* Смена статуса */}
          {!purchase.purchaseStatus.isLast && availableStatuses.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Изменить статус</div>
                <div className="flex gap-2">
                  <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: s.hexColor }}
                            />
                            {s.name}
                            {s.isLast && ' ★'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={selectedStatusId === purchase.purchaseStatus_id.toString()}
                    onClick={() => onStatusChange(parseInt(selectedStatusId))}
                  >
                    Применить
                  </Button>
                </div>
                {statuses.find((s) => s.id === parseInt(selectedStatusId))?.isLast && (
                  <p className="text-xs text-amber-600">★ Финальный статус — склад будет пополнен автоматически</p>
                )}
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" /> Позиции ({purchase.items.length})
            </h3>
            <div className="space-y-2">
              {purchase.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.article}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                      {item.autopart?.brand && (
                        <div className="text-xs text-muted-foreground">Бренд: {item.autopart.brand.name}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">Склад: {item.warehouse?.name}</div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.purchase_price)}
                      </div>
                      <div className="font-bold text-base">
                        {formatCurrency(item.quantity * item.purchase_price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Итого</span>
            <span className="text-xl font-bold">{formatCurrency(purchase.totalAmount)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
