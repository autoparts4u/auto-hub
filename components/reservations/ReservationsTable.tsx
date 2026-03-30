'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Ban, Package, RefreshCw, Search, ShoppingCart, Trash2, SlidersHorizontal, X } from 'lucide-react';
import { ClientBulkOrderModal } from './ClientBulkOrderModal';
import { RESERVATIONS_READ_EVENT } from '@/lib/hooks/useReservationBadge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type ReservationStatus = 'active' | 'cancelled' | 'expired' | 'converted';

type DatePreset = 'all' | 'today' | 'week' | 'month';

interface Warehouse {
  id: number;
  name: string;
}

interface Client {
  id: string;
  name: string;
  fullName: string; // для совместимости, здесь = name
}

interface Reservation {
  id: string;
  status: ReservationStatus;
  quantity: number;
  notes: string | null;
  reservedAt: string;
  expiresAt: string;
  client: { id: string; name: string; phone: string | null };
  autopart: { id: string; article: string; description: string; brand: { name: string } | null };
  warehouse: { id: number; name: string } | null;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'Всё время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: '7 дней' },
  { value: 'month', label: '30 дней' },
];

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (preset === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (preset === 'month') {
    const start = new Date(now); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  return { from: null, to: null };
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  active: 'Активна',
  cancelled: 'Отменена',
  expired: 'Истекла',
  converted: 'В заказе',
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  converted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'expired', label: 'Истекшие' },
  { value: 'cancelled', label: 'Отменённые' },
  { value: 'converted', label: 'В заказах' },
];

export function ReservationsTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [uniqueClients, setUniqueClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [bulkOrderClientId, setBulkOrderClientId] = useState<string | null>(null);
  // warehouseSelections: reservationId → warehouseId string
  const [warehouseSelections, setWarehouseSelections] = useState<Record<string, string>>({});

  const activeFiltersCount = [
    clientFilter !== 'all',
    datePreset !== 'all' || dateFrom || dateTo,
  ].filter(Boolean).length;

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/reservations?status=${statusFilter}` : '/api/reservations';
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data: Reservation[] = await res.json();
      setReservations(data);
      // Инициализируем уже назначенные склады
      const initial: Record<string, string> = {};
      data.forEach(r => {
        if (r.warehouse?.id) initial[r.id] = String(r.warehouse.id);
      });
      setWarehouseSelections(prev => ({ ...initial, ...prev }));
    } catch {
      toast.error('Ошибка загрузки резерваций');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Загрузка при монтировании + авто-обновление каждые 30 секунд
  useEffect(() => {
    fetchReservations();
    const id = setInterval(() => fetchReservations(), 30_000);
    return () => clearInterval(id);
  }, [fetchReservations]);

  // Сбрасываем бейдж непрочитанных при открытии страницы
  useEffect(() => {
    localStorage.setItem('reservations_last_seen', new Date().toISOString());
    window.dispatchEvent(new CustomEvent(RESERVATIONS_READ_EVENT));
  }, []);

  useEffect(() => {
    fetch('/api/warehouses')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setWarehouses(data); })
      .catch(() => {});

    // Загружаем все бронирования (без фильтра) один раз для списка клиентов
    fetch('/api/reservations')
      .then(r => r.json())
      .then((data: Reservation[]) => {
        if (!Array.isArray(data)) return;
        const seen = new Set<string>();
        const clients: Client[] = [];
        for (const r of data) {
          if (!seen.has(r.client.id)) {
            seen.add(r.client.id);
            clients.push({ id: r.client.id, name: r.client.name, fullName: r.client.name });
          }
        }
        clients.sort((a, b) => a.name.localeCompare(b.name));
        setUniqueClients(clients);
      })
      .catch(() => {});
  }, []);

  const resetFilters = () => {
    setClientFilter('all');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const handleWarehouseAssign = async (reservationId: string, warehouseId: string) => {
    setWarehouseSelections(prev => ({ ...prev, [reservationId]: warehouseId }));
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId: parseInt(warehouseId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Ошибка назначения склада');
      }
    } catch {
      toast.error('Ошибка назначения склада');
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Ошибка отмены');
        return;
      }
      toast.success('Резервация отменена');
      fetchReservations();
    } catch {
      toast.error('Ошибка отмены резервации');
    } finally {
      setCancellingId(null);
    }
  };

  const handleHardDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Ошибка удаления');
        return;
      }
      toast.success('Резервация удалена');
      fetchReservations();
    } catch {
      toast.error('Ошибка удаления резервации');
    }
  };

  const handleConvert = async (id: string) => {
    setConvertingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Ошибка создания заказа');
        return;
      }
      toast.success('Заказ создан успешно');
      fetchReservations();
    } catch {
      toast.error('Ошибка создания заказа');
    } finally {
      setConvertingId(null);
    }
  };

  // Клиенты с ≥2 активными резервациями (для кнопки общего заказа)
  const activeByClient = new Map<string, Reservation[]>();
  reservations
    .filter((r) => r.status === 'active')
    .forEach((r) => {
      if (!activeByClient.has(r.client.id)) activeByClient.set(r.client.id, []);
      activeByClient.get(r.client.id)!.push(r);
    });
  const bulkOrderClient = bulkOrderClientId ? activeByClient.get(bulkOrderClientId) : undefined;

  const filtered = reservations.filter(r => {
    // Текстовый поиск
    if (search) {
      const q = search.toLowerCase();
      const match =
        r.autopart.article.toLowerCase().includes(q) ||
        r.autopart.description.toLowerCase().includes(q) ||
        r.client.name.toLowerCase().includes(q) ||
        (r.client.phone ?? '').includes(q);
      if (!match) return false;
    }

    // Фильтр по клиенту
    if (clientFilter !== 'all' && r.client.id !== clientFilter) return false;

    // Фильтр по периоду (преднастройка или произвольный диапазон)
    const reservedAt = new Date(r.reservedAt);
    if (datePreset !== 'all') {
      const { from, to } = getPresetRange(datePreset);
      if (from && reservedAt < from) return false;
      if (to && reservedAt > to) return false;
    } else {
      if (dateFrom) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        if (reservedAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        if (reservedAt > to) return false;
      }
    }

    return true;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const isExpiringSoon = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 2 * 60 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="space-y-2">
        {/* Строка 1: статус + поиск + доп. фильтры + обновить */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Статус */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
            {STATUS_FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Поиск */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Артикул, деталь, клиент..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Клиент */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Все клиенты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все клиенты</SelectItem>
              {uniqueClients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Период — быстрые кнопки */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
            {DATE_PRESETS.map(p => (
              <button
                key={p.value}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  datePreset === p.value && !dateFrom && !dateTo
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setDatePreset(p.value); setDateFrom(''); setDateTo(''); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Произвольный диапазон дат */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-1.5 ${(dateFrom || dateTo) ? 'border-primary text-primary' : ''}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {dateFrom || dateTo ? `${dateFrom || '…'} — ${dateTo || '…'}` : 'Диапазон'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3 p-4" align="end">
              <div className="space-y-1.5">
                <Label className="text-xs">С</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setDatePreset('all'); }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">По</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setDatePreset('all'); }}
                  className="h-8 text-sm"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                >
                  Сбросить даты
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Сброс всех фильтров */}
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground h-9">
              <X className="w-3.5 h-3.5" />
              Сбросить ({activeFiltersCount})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={fetchReservations} disabled={loading} className="h-9 ml-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Десктопная таблица */}
      <div className="hidden md:block rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="px-3 py-3 text-left text-xs font-semibold">Артикул / Описание</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">Клиент</th>
              <th className="px-3 py-3 text-center text-xs font-semibold">Кол-во</th>
              <th className="px-3 py-3 text-center text-xs font-semibold">Склад</th>
              <th className="px-3 py-3 text-center text-xs font-semibold">Статус</th>
              <th className="px-3 py-3 text-center text-xs font-semibold">Истекает</th>
              <th className="px-2 py-3 text-center text-xs font-semibold w-[100px]">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-background">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Загрузка...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Резервации не найдены</td></tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b transition-colors hover:bg-accent ${
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/40'
                  }`}
                >
                  <td className="px-3 py-3 border-r">
                    <div className="font-mono font-semibold text-xs">{r.autopart.article}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.autopart.description}</div>
                    {r.autopart.brand && <div className="text-xs text-muted-foreground">{r.autopart.brand.name}</div>}
                    {r.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{r.notes}</div>}
                  </td>
                  <td className="px-3 py-3 border-r">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-medium">{r.client.name}</div>
                      {r.status === 'active' && (activeByClient.get(r.client.id)?.length ?? 0) >= 2 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setBulkOrderClientId(r.client.id)}
                              >
                                <Package className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              Создать общий заказ ({activeByClient.get(r.client.id)?.length} позиций)
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {r.client.phone && <div className="text-xs text-muted-foreground">{r.client.phone}</div>}
                  </td>
                  <td className="px-3 py-3 border-r text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {r.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-3 border-r text-center">
                    {r.status === 'active' ? (
                      <Select
                        value={warehouseSelections[r.id] ?? ''}
                        onValueChange={val => handleWarehouseAssign(r.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs w-[130px] mx-auto">
                          <SelectValue placeholder="Выбрать склад" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={String(w.id)} className="text-xs">
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.warehouse?.name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 border-r text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className={`px-3 py-3 border-r text-center text-xs ${
                    r.status === 'active' && isExpiringSoon(r.expiresAt)
                      ? 'text-amber-600 font-semibold'
                      : 'text-muted-foreground'
                  }`}>
                    {formatDate(r.expiresAt)}
                    {r.status === 'active' && isExpiringSoon(r.expiresAt) && (
                      <div className="text-[10px] text-amber-500">скоро истекает</div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'active' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={convertingId === r.id || !warehouseSelections[r.id]}
                                  onClick={() => handleConvert(r.id)}
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                {warehouseSelections[r.id] ? 'Создать заказ' : 'Сначала выберите склад'}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={cancellingId === r.id}
                                  onClick={() => handleCancel(r.id)}
                                >
                                  <Ban className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">Отменить резервацию</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeletingId(r.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Удалить резервацию</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Мобильные карточки */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Резервации не найдены</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-mono font-semibold text-sm">{r.autopart.article}</div>
                  <div className="text-xs text-muted-foreground">{r.autopart.description}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-muted-foreground">Клиент: </span>
                  <span className="font-medium">{r.client.name}</span>
                  {r.status === 'active' && (activeByClient.get(r.client.id)?.length ?? 0) >= 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-blue-600 hover:bg-blue-50"
                      onClick={() => setBulkOrderClientId(r.client.id)}
                    >
                      <Package className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div><span className="text-muted-foreground">Кол-во: </span><span className="font-semibold text-primary">{r.quantity}</span></div>
                <div><span className="text-muted-foreground">Телефон: </span><span>{r.client.phone ?? '—'}</span></div>
              </div>

              {r.status === 'active' && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground font-medium">Склад</div>
                  <Select
                    value={warehouseSelections[r.id] ?? ''}
                    onValueChange={val => handleWarehouseAssign(r.id, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Выбрать склад" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={String(w.id)} className="text-xs">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {r.status !== 'active' && r.warehouse && (
                <div className="text-xs"><span className="text-muted-foreground">Склад: </span>{r.warehouse.name}</div>
              )}

              <div className={`text-xs ${r.status === 'active' && isExpiringSoon(r.expiresAt) ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                Истекает: {formatDate(r.expiresAt)}
                {r.status === 'active' && isExpiringSoon(r.expiresAt) && ' ⚠️'}
              </div>

              {r.notes && (
                <div className="text-xs bg-muted/30 rounded px-2 py-1.5">
                  <span className="text-muted-foreground">Примечание: </span>{r.notes}
                </div>
              )}

              <div className="flex gap-2">
                {r.status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                      disabled={convertingId === r.id || !warehouseSelections[r.id]}
                      onClick={() => handleConvert(r.id)}
                    >
                      <ShoppingCart className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Создать заказ</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={cancellingId === r.id}
                      onClick={() => handleCancel(r.id)}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeletingId(r.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && (
        <div className="text-xs text-muted-foreground text-right">
          Показано: {filtered.length} из {reservations.length}
        </div>
      )}

      {bulkOrderClientId && bulkOrderClient && (
        <ClientBulkOrderModal
          clientName={bulkOrderClient[0].client.name}
          reservations={bulkOrderClient}
          warehouses={warehouses}
          onClose={() => setBulkOrderClientId(null)}
          onSuccess={() => {
            setBulkOrderClientId(null);
            fetchReservations();
          }}
        />
      )}

      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle>Удалить резервацию?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Резервация будет удалена безвозвратно.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Назад
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingId) {
                  handleHardDelete(deletingId);
                  setDeletingId(null);
                }
              }}
            >
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
