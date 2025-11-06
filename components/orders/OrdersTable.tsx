'use client';

import { useState, useEffect } from 'react';
import { Order, OrderStatus, Client } from '@/app/types/orders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import OrderModal from './OrderModal';
import OrderDetailsModal from './OrderDetailsModal';
import OrderPaymentModal from './OrderPaymentModal';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  priceAccessId?: number;
}

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, clientFilter, unpaidIssuedFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Формируем параметры запроса
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (clientFilter && clientFilter !== 'all') params.append('client', clientFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (unpaidIssuedFilter) params.append('unpaidIssued', 'true');

      const [ordersRes, statusesRes, clientsRes, usersRes] = await Promise.all([
        fetch(`/api/orders?${params.toString()}`),
        fetch('/api/order-statuses'),
        fetch('/api/clients'),
        fetch('/api/users'),
      ]);

      if (ordersRes.ok && statusesRes.ok && clientsRes.ok && usersRes.ok) {
        const [ordersData, statusesData, clientsData, usersData] = await Promise.all([
          ordersRes.json(),
          statusesRes.json(),
          clientsRes.json(),
          usersRes.json(),
        ]);

        setOrders(ordersData);
        setStatuses(statusesData);

        // Объединяем клиентов и пользователей
        const clientUserIds = new Set(clientsData.filter((c: Client) => c.userId).map((c: Client) => c.userId));
        const usersWithoutClient = usersData.filter((user: UserItem) => !clientUserIds.has(user.id));
        
        // Преобразуем пользователей в формат клиентов
        const userAsClients: Client[] = usersWithoutClient.map((user: UserItem) => ({
          id: `user_${user.id}`,
          name: user.name || user.email,
          fullName: user.name || user.email,
          email: user.email,
          phone: user.phone || null,
          address: null,
          priceAccessId: user.priceAccessId || null,
          userId: user.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        setAllClients([...clientsData, ...userAsClients]);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Заказы</h2>
          <p className="text-muted-foreground">
            Управление заказами клиентов
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать заказ
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-4">
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

      {/* Таблица */}
      <div className="border rounded-lg">
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

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
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

