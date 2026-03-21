'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Supplier, PurchaseOrder, PurchaseStatus } from '@/app/types/purchases';

interface Warehouse {
  id: number;
  name: string;
}

interface AutopartOption {
  id: string;
  article: string;
  description: string;
  brand?: { name: string } | null;
}

interface PurchaseItem {
  autopart_id: string;
  autopartLabel: string;
  warehouse_id: number;
  quantity: number;
  purchase_price: number;
}

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPurchase?: PurchaseOrder | null;
  statuses: PurchaseStatus[];
}

export default function PurchaseModal({ open, onClose, onSuccess, editPurchase, statuses }: PurchaseModalProps) {
  const isEdit = !!editPurchase;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [notes, setNotes] = useState('');
  const [orderedAt, setOrderedAt] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);

  // New supplier inline
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Autopart search per row
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<AutopartOption[][]>([]);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchWarehouses();
      if (editPurchase) {
        setSupplierId(editPurchase.supplier_id.toString());
        setStatusId(editPurchase.purchaseStatus_id.toString());
        setNotes(editPurchase.notes || '');
        setOrderedAt(editPurchase.orderedAt.split('T')[0]);
        const mapped: PurchaseItem[] = editPurchase.items.map((item) => ({
          autopart_id: item.autopart_id || '',
          autopartLabel: item.autopart_id
            ? `${item.article} — ${item.description}`
            : `${item.article} — ${item.description}`,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
        }));
        setItems(mapped);
        setSearchQueries(mapped.map((i) => i.autopartLabel));
        setSearchResults(mapped.map(() => []));
      } else {
        const today = new Date().toISOString().split('T')[0];
        setSupplierId('');
        setNotes('');
        setOrderedAt(today);
        // Подставляем дефолтный статус из настроек
        fetch('/api/settings')
          .then(r => r.json())
          .then(data => {
            const defaultId = data.defaultPurchaseStatusId?.toString();
            const exists = statuses.some(s => s.id.toString() === defaultId);
            setStatusId(exists ? defaultId : (statuses[0]?.id.toString() || ''));
          })
          .catch(() => setStatusId(statuses[0]?.id.toString() || ''));
        setItems([]);
        setSearchQueries([]);
        setSearchResults([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers');
    if (res.ok) setSuppliers(await res.json());
  };

  const fetchWarehouses = async () => {
    const res = await fetch('/api/warehouses');
    if (res.ok) setWarehouses(await res.json());
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAutoparts = (query: string, index: number) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (query.length < 2) {
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
      return;
    }
    setSearchingIndex(index);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autoparts/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults((prev) => {
            const next = [...prev];
            next[index] = data;
            return next;
          });
        }
      } finally {
        setSearchingIndex(null);
      }
    }, 300);
  };

  const addItem = () => {
    const defaultWarehouse = warehouses[0]?.id || 0;
    setItems((prev) => [
      ...prev,
      { autopart_id: '', autopartLabel: '', warehouse_id: defaultWarehouse, quantity: 1, purchase_price: 0 },
    ]);
    setSearchQueries((prev) => [...prev, '']);
    setSearchResults((prev) => [...prev, []]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSearchQueries((prev) => prev.filter((_, i) => i !== index));
    setSearchResults((prev) => prev.filter((_, i) => i !== index));
  };

  const selectAutopart = (index: number, ap: AutopartOption) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        autopart_id: ap.id,
        autopartLabel: `${ap.article} — ${ap.description}`,
      };
      return next;
    });
    setSearchQueries((prev) => {
      const next = [...prev];
      next[index] = `${ap.article} — ${ap.description}`;
      return next;
    });
    setSearchResults((prev) => {
      const next = [...prev];
      next[index] = [];
      return next;
    });
  };

  const updateItem = <K extends keyof PurchaseItem>(index: number, field: K, value: PurchaseItem[K]) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveNewSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setSavingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim(), phone: newSupplierPhone.trim() || null }),
      });
      if (res.ok) {
        const created = await res.json();
        setSuppliers((prev) => [...prev, created]);
        setSupplierId(created.id.toString());
        setShowNewSupplier(false);
        setNewSupplierName('');
        setNewSupplierPhone('');
        toast.success('Поставщик добавлен');
      } else {
        toast.error('Ошибка добавления поставщика');
      }
    } finally {
      setSavingSupplier(false);
    }
  };

  const totalAmount = items.reduce((s, i) => s + i.quantity * i.purchase_price, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error('Выберите поставщика');
      return;
    }
    if (!statusId) {
      toast.error('Выберите статус');
      return;
    }
    if (items.length === 0) {
      toast.error('Добавьте хотя бы одну позицию');
      return;
    }
    if (items.some((i) => !i.autopart_id)) {
      toast.error('Выберите запчасть для каждой позиции');
      return;
    }
    if (items.some((i) => !i.warehouse_id)) {
      toast.error('Выберите склад для каждой позиции');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        purchaseStatus_id: parseInt(statusId),
        notes: notes || undefined,
        orderedAt,
        items: items.map((i) => ({
          autopart_id: i.autopart_id,
          warehouse_id: i.warehouse_id,
          quantity: i.quantity,
          purchase_price: i.purchase_price,
        })),
      };

      const url = isEdit ? `/api/purchases/${editPurchase!.id}` : '/api/purchases';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Поступление обновлено' : 'Поступление создано');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка сохранения');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-none flex flex-col h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{isEdit ? 'Редактировать поступление' : 'Новое поступление'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените данные поступления' : 'Создайте новое поступление запчастей от поставщика'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Поставщик */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Поставщик *</Label>
              {showNewSupplier ? (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  <Input
                    placeholder="Название поставщика *"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                  />
                  <Input
                    placeholder="Телефон"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNewSupplier} disabled={savingSupplier || !newSupplierName.trim()}>
                      {savingSupplier ? 'Сохранение...' : 'Добавить'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewSupplier(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите поставщика" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => setShowNewSupplier(true)} title="Новый поставщик">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Статус *</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.hexColor }} />
                        {s.name}
                        {s.isLast && <span className="text-xs text-muted-foreground ml-1">★</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Дата заказа</Label>
              <input
                type="date"
                value={orderedAt}
                onChange={(e) => setOrderedAt(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              placeholder="Дополнительная информация..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          {/* Позиции */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Позиции ({items.length})
              </h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                Нажмите «Добавить» чтобы добавить запчасти
              </div>
            )}

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3">
                {/* Поиск запчасти */}
                <div className="space-y-1">
                  <Label className="text-xs">Запчасть</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 text-sm"
                      placeholder="Артикул или описание..."
                      value={searchQueries[index] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQueries((prev) => {
                          const next = [...prev];
                          next[index] = val;
                          return next;
                        });
                        if (!val) {
                          updateItem(index, 'autopart_id', '');
                          updateItem(index, 'autopartLabel', '');
                        }
                        searchAutoparts(val, index);
                      }}
                    />
                    {searchResults[index]?.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults[index].map((ap) => (
                          <button
                            key={ap.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectAutopart(index, ap);
                            }}
                          >
                            <div className="font-medium">{ap.article}</div>
                            <div className="text-xs text-muted-foreground">{ap.description} {ap.brand?.name ? `· ${ap.brand.name}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchingIndex === index && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
                        Поиск...
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Склад</Label>
                    <Select
                      value={item.warehouse_id ? item.warehouse_id.toString() : ''}
                      onValueChange={(v) => updateItem(index, 'warehouse_id', parseInt(v))}
                    >
                      <SelectTrigger className="text-sm h-9">
                        <SelectValue placeholder="Склад" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id.toString()}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Количество</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Закупочная цена</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-9 text-sm"
                      value={item.purchase_price}
                      onChange={(e) => updateItem(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Итого: <span className="font-semibold text-foreground">{formatCurrency(item.quantity * item.purchase_price)}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm">
            Сумма заказа:{' '}
            <span className="font-bold text-base">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать поступление'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
