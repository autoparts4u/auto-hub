'use client';

import { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Client } from '@/app/types/orders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Eye, 
  Trash2, 
  Plus, 
  Search,
  Package,
  Truck,
  Calendar,
  DollarSign,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import OrderModal from './OrderModal';
import OrderDetailsModal from './OrderDetailsModal';
import OrderPaymentModal from './OrderPaymentModal';

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [unpaidIssuedFilter, setUnpaidIssuedFilter] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [showFilters, setShowFilters] = useState(true);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  const lastScrollY = useRef(0);
  const filtersModalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, clientFilter, unpaidIssuedFilter]);

  // Автоматическое скрытие фильтров при скролле вниз на мобильных
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 768) return;
      
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 100 && showFilters) {
        setShowFilters(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showFilters]);

  // Закрытие модального окна фильтров при изменении размера на десктоп
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && showFiltersModal) {
        setShowFiltersModal(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showFiltersModal]);

  // Прокрутка контента фильтров наверх при открытии
  useEffect(() => {
    if (showFiltersModal) {
      const scrollToTop = () => {
        if (filtersModalContentRef.current) {
          filtersModalContentRef.current.scrollTop = 0;
        }
      };
      
      scrollToTop();
      const rafId = requestAnimationFrame(scrollToTop);
      const timers = [
        setTimeout(scrollToTop, 0),
        setTimeout(scrollToTop, 50),
        setTimeout(scrollToTop, 100),
        setTimeout(scrollToTop, 200),
      ];
      
      return () => {
        cancelAnimationFrame(rafId);
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [showFiltersModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Формируем параметры запроса
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (clientFilter && clientFilter !== 'all') params.append('client', clientFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (unpaidIssuedFilter) params.append('unpaidIssued', 'true');

      const [ordersRes, statusesRes, clientsRes] = await Promise.all([
        fetch(`/api/orders?${params.toString()}`),
        fetch('/api/order-statuses'),
        fetch('/api/clients'),
      ]);

      if (ordersRes.ok && statusesRes.ok && clientsRes.ok) {
        const [ordersData, statusesData, clientsData] = await Promise.all([
          ordersRes.json(),
          statusesRes.json(),
          clientsRes.json(),
        ]);

        setOrders(ordersData);
        setStatuses(statusesData);
        
        // Используем только клиентов, так как теперь каждый User связан с Client
        setAllClients(clientsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Заказ успешно удален');
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ошибка удаления заказа');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Ошибка удаления заказа');
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleOpenPayment = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentModalOpen(true);
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

  const getStatusBadge = (status: OrderStatus) => {
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

  // Подсчет активных фильтров
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter && statusFilter !== 'all') count++;
    if (clientFilter && clientFilter !== 'all') count++;
    if (unpaidIssuedFilter) count++;
    return count;
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      order.client?.name.toLowerCase().includes(search) ||
      order.notes?.toLowerCase().includes(search) ||
      order.trackingNumber?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка создания */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Заказы</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Управление заказами клиентов
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Создать заказ</span>
        </Button>
      </div>

      {/* Фильтры - только десктоп */}
      <div className={`hidden md:flex gap-4 transition-all duration-300 ${showFilters ? '' : 'hidden'}`}>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру, клиенту, трекинг-номеру..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все клиенты" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все клиенты</SelectItem>
            {allClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={() => setUnpaidIssuedFilter(!unpaidIssuedFilter)} 
          variant={unpaidIssuedFilter ? "default" : "outline"}
          className={unpaidIssuedFilter ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Неоплаченные
        </Button>
        <Button onClick={handleSearch} variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Таблица - только десктоп */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>№ Заказа</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Позиций
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Сумма
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Доставка
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Создан
                </div>
              </TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Заказы не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.client?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.client?.fullName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.orderStatus && getStatusBadge(order.orderStatus)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.orderItems?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      {order.discount > 0 && (
                        <div className="text-xs text-green-600">
                          -{formatCurrency(order.discount)} скидка
                        </div>
                      )}
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
                  </TableCell>
                  <TableCell>
                    {order.deliveryMethod ? (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: order.deliveryMethod.hexColor || undefined,
                          color: order.deliveryMethod.hexColor || undefined,
                        }}
                      >
                        {order.deliveryMethod.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(order)}
                        title="Просмотр деталей"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenPayment(order)}
                        title="Оплата"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      {!order.orderStatus?.isLast && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(order.id)}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Мобильная версия - карточки */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8">Заказы не найдены</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="p-4 space-y-3">
                {/* Заголовок карточки */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      № {order.id.substring(0, 8)}...
                    </div>
                    <h3 className="font-semibold text-base truncate" title={order.client?.name}>
                      {order.client?.name}
                    </h3>
                    {order.client?.fullName && (
                      <p className="text-sm text-muted-foreground truncate" title={order.client.fullName}>
                        {order.client.fullName}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {order.orderStatus && getStatusBadge(order.orderStatus)}
                  </div>
                </div>

                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span className="text-xs">Позиций</span>
                    </div>
                    <div className="font-medium">
                      <Badge variant="outline">{order.orderItems?.length || 0}</Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-xs">Сумма</span>
                    </div>
                    <div className="font-semibold">{formatCurrency(order.totalAmount)}</div>
                    {order.discount > 0 && (
                      <div className="text-xs text-green-600">
                        -{formatCurrency(order.discount)} скидка
                      </div>
                    )}
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
                </div>

                {/* Доставка и дата */}
                <div className="pt-3 border-t space-y-2">
                  {order.deliveryMethod && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: order.deliveryMethod.hexColor || undefined,
                          color: order.deliveryMethod.hexColor || undefined,
                        }}
                      >
                        {order.deliveryMethod.name}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/30 rounded-b-lg border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(order)}
                  title="Просмотр деталей"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Детали
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenPayment(order)}
                  title="Оплата"
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Оплата
                </Button>
                {!order.orderStatus?.isLast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(order.id)}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Всего заказов</div>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Активных</div>
          <div className="text-2xl font-bold">
            {orders.filter((o) => !o.orderStatus?.isLast).length}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Завершенных</div>
          <div className="text-2xl font-bold">
            {orders.filter((o) => o.orderStatus?.isLast).length}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Общая сумма</div>
          <div className="text-2xl font-bold">
            {formatCurrency(
              orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
            )}
          </div>
        </div>
      </div>

      {/* Плавающая кнопка фильтров (только мобильные) */}
      {!showFilters && (
        <div className="md:hidden fixed bottom-6 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Button
            size="lg"
            onClick={() => setShowFiltersModal(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <div className="relative">
              <Filter className="w-6 h-6" />
              {getActiveFiltersCount() > 0 && (
                <span className="absolute -top-2 -right-2 text-xs font-bold">
                  {getActiveFiltersCount()}
                </span>
              )}
            </div>
          </Button>
        </div>
      )}

      {/* Модальное окно фильтров (только мобильные) */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent 
          key={String(showFiltersModal)}
          className="max-w-[95vw] w-full max-h-[90vh] p-0 flex flex-col rounded-2xl overflow-hidden"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-primary" />
                Фильтры
                {getActiveFiltersCount() > 0 && (
                  <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFiltersModal(false)}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                title="Закрыть"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div 
            ref={(el) => {
              filtersModalContentRef.current = el;
              if (el) {
                el.scrollTop = 0;
              }
            }}
            className="overflow-y-auto flex-1"
          >
            <div className="px-6 py-4 space-y-4">
              {/* Поиск */}
              <div className="space-y-2">
                <Label htmlFor="modal-search" className="text-sm font-semibold">Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="modal-search"
                    placeholder="Поиск по номеру, клиенту, трекинг-номеру..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-8"
                    autoFocus={false}
                  />
                </div>
              </div>

              {/* Статус */}
              <div className="space-y-2">
                <Label htmlFor="modal-status" className="text-sm font-semibold">Статус</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="modal-status" className="w-full">
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Клиент */}
              <div className="space-y-2">
                <Label htmlFor="modal-client" className="text-sm font-semibold">Клиент</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger id="modal-client" className="w-full">
                    <SelectValue placeholder="Все клиенты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все клиенты</SelectItem>
                    {allClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Неоплаченные */}
              <div className="pt-2">
                <Label className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/50 has-[[aria-checked=true]]:border-orange-600 has-[[aria-checked=true]]:bg-orange-50 dark:has-[[aria-checked=true]]:border-orange-900 dark:has-[[aria-checked=true]]:bg-orange-950">
                  <input
                    type="checkbox"
                    checked={unpaidIssuedFilter}
                    onChange={(e) => setUnpaidIssuedFilter(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Неоплаченные выданные
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Показать только неоплаченные выданные заказы</p>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="bg-background border-t px-6 py-4 flex gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setClientFilter('all');
                setUnpaidIssuedFilter(false);
              }}
            >
              Сбросить
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                handleSearch();
                setShowFiltersModal(false);
              }}
            >
              Применить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальные окна */}
      <OrderModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          fetchData();
        }}
        clients={allClients}
        statuses={statuses}
      />

      {selectedOrder && (
        <>
          <OrderDetailsModal
            open={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedOrder(null);
              fetchData();
            }}
            orderId={selectedOrder.id}
            statuses={statuses}
          />
          <OrderPaymentModal
            open={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedOrder(null);
            }}
            orderId={selectedOrder.id}
            onPaymentUpdate={fetchData}
          />
        </>
      )}
    </div>
  );
}

