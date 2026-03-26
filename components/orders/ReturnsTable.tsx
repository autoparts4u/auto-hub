'use client';

import { useState, useEffect, useCallback } from 'react';
import { Return, ReturnStatus } from '@/app/types/orders';
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
} from '@/components/ui/dialog';
import { Plus, Search, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { getContrastTextColor } from '@/lib/utils';
import FreeReturnModal from './FreeReturnModal';

// Расширенный тип с order (подтягивается из GET /api/returns без фильтра)
interface ReturnWithOrder extends Return {
  order?: { id: string; createdAt: string } | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ReturnsTable() {
  const [returns, setReturns] = useState<ReturnWithOrder[]>([]);
  const [statuses, setStatuses] = useState<ReturnStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [detailReturn, setDetailReturn] = useState<ReturnWithOrder | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const [returnsRes, statusesRes] = await Promise.all([
        fetch(`/api/returns?${params}`),
        fetch('/api/return-statuses'),
      ]);

      if (returnsRes.ok) setReturns(await returnsRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
    } catch {
      if (!silent) toast.error('Ошибка загрузки');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusUpdate = async (returnId: string, returnStatus_id: number) => {
    const res = await fetch(`/api/returns/${returnId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnStatus_id }),
    });

    if (res.ok) {
      toast.success('Статус обновлён');
      fetchData(true);
      if (detailReturn?.id === returnId) {
        const updated = await res.json();
        setDetailReturn((prev) => prev ? { ...prev, ...updated } : null);
      }
    } else {
      const err = await res.json();
      toast.error(err.error || 'Ошибка обновления');
    }
  };

  const pending = returns.filter((r) => !r.resolvedAt).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по клиенту, артикулу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pending > 0 && (
            <span className="text-sm text-muted-foreground">
              Ожидает обработки: <span className="font-semibold text-foreground">{pending}</span>
            </span>
          )}
        </div>
        <Button onClick={() => setShowFreeModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Новый возврат
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Возвратов не найдено</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Дата</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Позиции</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Причина</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((ret) => (
                <>
                  <TableRow
                    key={ret.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId((prev) => (prev === ret.id ? null : ret.id))}
                  >
                    <TableCell className="px-2">
                      {expandedId === ret.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(ret.createdAt)}
                    </TableCell>
                    <TableCell>
                      {ret.client ? (
                        <div>
                          <div className="text-sm font-medium">{ret.client.name}</div>
                          <div className="text-xs text-muted-foreground">{ret.client.fullName}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ret.order ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          #{ret.order.id.substring(0, 8)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">без заказа</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ret.items.length} шт.</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: ret.returnStatus.hexColor,
                          color: getContrastTextColor(ret.returnStatus.hexColor),
                        }}
                      >
                        {ret.returnStatus.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <span className="text-sm text-muted-foreground truncate block">
                        {ret.reason || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {!ret.resolvedAt ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50 h-7 px-2 text-xs"
                            onClick={() => handleStatusUpdate(ret.id, 2)}
                          >
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                            onClick={() => handleStatusUpdate(ret.id, 3)}
                          >
                            Отклонить
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {ret.resolvedAt ? formatDate(ret.resolvedAt) : ''}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Раскрытые позиции */}
                  {expandedId === ret.id && (
                    <TableRow key={`${ret.id}-detail`} className="bg-muted/10">
                      <TableCell colSpan={8} className="py-3 px-6">
                        <div className="space-y-1.5">
                          {ret.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-semibold text-xs">{item.article}</span>
                                <span className="text-muted-foreground">{item.description}</span>
                              </div>
                              <span className="text-muted-foreground shrink-0">{item.quantity} шт.</span>
                            </div>
                          ))}
                          {ret.adminComment && (
                            <div className="text-xs text-muted-foreground border-t pt-1.5 mt-1.5">
                              Комментарий: {ret.adminComment}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FreeReturnModal
        open={showFreeModal}
        onClose={() => setShowFreeModal(false)}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
