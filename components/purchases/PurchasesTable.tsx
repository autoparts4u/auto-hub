'use client';

import { useState, useEffect } from 'react';
import { PurchaseOrder, PurchaseStatus, Supplier } from '@/app/types/purchases';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, Trash2, Pencil, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getContrastTextColor } from '@/lib/utils';
import PurchaseModal from './PurchaseModal';

export default function PurchasesTable() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [statuses, setStatuses] = useState<PurchaseStatus[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, supplierFilter]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (supplierFilter !== 'all') params.append('supplier', supplierFilter);
      if (searchTerm) params.append('search', searchTerm);

      const [purchasesRes, statusesRes, suppliersRes] = await Promise.all([
        fetch(`/api/purchases?${params}`),
        fetch('/api/purchase-statuses'),
        fetch('/api/suppliers'),
      ]);

      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
    } catch {
      if (!silent) toast.error('Ошибка загрузки данных');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStatusChange = async (purchase: PurchaseOrder, newStatusId: number) => {
    const newStatus = statuses.find((s) => s.id === newStatusId);
    if (!newStatus) return;

    if (newStatus.isLast && !confirm(`Перевести в статус «${newStatus.name}»? Склад будет пополнен автоматически.`)) return;

    // Оптимистичное обновление — модал остаётся открытым
    const updatedPurchase: PurchaseOrder = {
      ...purchase,
      purchaseStatus_id: newStatusId,
      purchaseStatus: newStatus,
      receivedAt: newStatus.isLast ? new Date().toISOString() : purchase.receivedAt,
    };
    setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? updatedPurchase : p)));
    if (viewingPurchase?.id === purchase.id) setViewingPurchase(updatedPurchase);

    const res = await fetch(`/api/purchases/${purchase.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseStatus_id: newStatusId }),
    });
    if (res.ok) {
      toast.success(newStatus.isLast ? 'Статус обновлён, склад пополнен' : 'Статус обновлён');
      fetchData(true); // тихий фоновый рефетч
    } else {
      // откат
      setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? purchase : p)));
      if (viewingPurchase?.id === purchase.id) setViewingPurchase(purchase);
      const err = await res.json();
      toast.error(err.error || 'Ошибка');
    }
  };

  const handleDelete = async (purchase: PurchaseOrder) => {
    const warning = purchase.purchaseStatus.isLast
      ? 'Внимание: склад будет уменьшен обратно. Удалить поступление?'
      : 'Удалить поступление?';
    if (!confirm(warning)) return;

    // Оптимистичное удаление
    setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
    if (viewingPurchase?.id === purchase.id) setViewingPurchase(null);

    const res = await fetch(`/api/purchases/${purchase.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Поступление удалено');
    } else {
      // откат
      setPurchases((prev) => [...prev, purchase]);
      const err = await res.json();
      toast.error(err.error || 'Ошибка удаления');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

  const filteredPurchases = purchases.filter((p) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      p.supplier.name.toLowerCase().includes(s) ||
      p.notes?.toLowerCase().includes(s) ||
      p.items.some((i) => i.article.toLowerCase().includes(s) || i.description.toLowerCase().includes(s))
    );
  });

  const pendingCount = purchases.filter((p) => !p.purchaseStatus.isLast).length;
  const receivedCount = purchases.filter((p) => p.purchaseStatus.isLast).length;
  const totalSum = purchases.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Поступления</h2>
          <p className="text-sm text-muted-foreground">Закупки запчастей у поставщиков</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={statuses.length === 0}>
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Новое поступление</span>
        </Button>
      </div>

      {statuses.length === 0 && !loading && (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground bg-muted/20">
          Сначала создайте статусы поступлений в разделе <strong>Общие → Заказы → Статусы поступлений</strong>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-xs text-muted-foreground">В процессе</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{receivedCount}</div>
          <div className="text-xs text-muted-foreground">Завершено</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{formatCurrency(totalSum)}</div>
          <div className="text-xs text-muted-foreground">Общая сумма</div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по поставщику, артикулу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.hexColor }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Поставщик" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все поставщики</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Поставщик</TableHead>
              <TableHead>Дата заказа</TableHead>
              <TableHead>Позиции</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Получено</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell>
              </TableRow>
            ) : filteredPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Поступлений не найдено</TableCell>
              </TableRow>
            ) : (
              filteredPurchases.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setViewingPurchase(purchase)}
                >
                  <TableCell className="font-medium">{purchase.supplier.name}</TableCell>
                  <TableCell>{formatDate(purchase.orderedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      {purchase.items.length}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(purchase.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge style={{
                      backgroundColor: purchase.purchaseStatus.hexColor,
                      color: getContrastTextColor(purchase.purchaseStatus.hexColor),
                    }}>
                      {purchase.purchaseStatus.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {purchase.receivedAt ? formatDate(purchase.receivedAt) : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {!purchase.purchaseStatus.isLast && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Редактировать" onClick={() => setEditingPurchase(purchase)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Удалить" onClick={() => handleDelete(purchase)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Просмотр деталей */}
      {viewingPurchase && (
        <PurchaseDetailsModal
          purchase={viewingPurchase}
          statuses={statuses}
          onClose={() => setViewingPurchase(null)}
          onStatusChange={(newStatusId) => handleStatusChange(viewingPurchase, newStatusId)}
          onEdit={() => { setEditingPurchase(viewingPurchase); setViewingPurchase(null); }}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      )}

      <PurchaseModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchData(true)}
        statuses={statuses}
      />

      <PurchaseModal
        open={!!editingPurchase}
        onClose={() => setEditingPurchase(null)}
        onSuccess={() => fetchData(true)}
        editPurchase={editingPurchase}
        statuses={statuses}
      />
    </div>
  );
}

function PurchaseDetailsModal({ purchase, statuses, onClose, onStatusChange, onEdit, formatDate, formatCurrency }: {
  purchase: PurchaseOrder;
  statuses: PurchaseStatus[];
  onClose: () => void;
  onStatusChange: (statusId: number) => void;
  onEdit: () => void;
  formatDate: (d: string) => string;
  formatCurrency: (v: number) => string;
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
            {!purchase.purchaseStatus.isLast && (
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Изменить
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
              {purchase.supplier.contactPerson && <div className="text-muted-foreground">{purchase.supplier.contactPerson}</div>}
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-muted-foreground mb-1">Статус</div>
                <Badge style={{
                  backgroundColor: purchase.purchaseStatus.hexColor,
                  color: getContrastTextColor(purchase.purchaseStatus.hexColor),
                }}>
                  {purchase.purchaseStatus.name}
                </Badge>
              </div>
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
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.hexColor }} />
                            {s.name}{s.isLast && ' ★'}
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
                      {item.autopart?.brand && <div className="text-xs text-muted-foreground">Бренд: {item.autopart.brand.name}</div>}
                      <div className="text-xs text-muted-foreground mt-1">Склад: {item.warehouse?.name}</div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-sm text-muted-foreground">{item.quantity} × {formatCurrency(item.purchase_price)}</div>
                      <div className="font-bold text-base">{formatCurrency(item.quantity * item.purchase_price)}</div>
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
