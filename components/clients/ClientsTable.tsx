'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Client, PriceType, Warehouse } from '@/app/types/orders';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Tag,
  Link as LinkIcon,
  UserCheck,
  UserX,
  Shield,
  Database,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import ClientModal from './ClientModal';
import UserModal from './UserModal';

interface ClientsTableProps {
  priceTypes: PriceType[];
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: string;
  priceAccessId?: number | null;
  warehouseAccessId?: number | null;
  isConfirmed: boolean;
}

export default function ClientsTable({ priceTypes }: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  
  const [showFilters, setShowFilters] = useState(true);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  const lastScrollY = useRef(0);
  const filtersModalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

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
      
      // Загружаем клиентов (теперь они содержат всю необходимую информацию, включая user)
      const clientsResponse = await fetch('/api/clients');
      if (!clientsResponse.ok) throw new Error('Failed to fetch clients');
      const clientsData = await clientsResponse.json();
      setClients(clientsData);

      // Загружаем пользователей (для вкладки "Пользователи")
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const usersData = await usersResponse.json();
      
      // Преобразуем пользователей в формат UserItem
      const transformedUsers: UserItem[] = usersData.map((user: {
        id: string;
        email: string;
        role: string;
        isConfirmed: boolean;
        client?: {
          name?: string;
          phone?: string;
          address?: string;
          priceAccessId?: number | null;
          warehouseAccessId?: number | null;
        };
      }) => ({
        id: user.id,
        name: user.client?.name ?? null,
        email: user.email,
        phone: user.client?.phone ?? null,
        address: user.client?.address ?? null,
        role: user.role,
        priceAccessId: user.client?.priceAccessId ?? null,
        warehouseAccessId: user.client?.warehouseAccessId ?? null,
        isConfirmed: user.isConfirmed,
      }));
      setUsers(transformedUsers);

      // Загружаем склады
      const warehousesResponse = await fetch('/api/warehouses');
      if (!warehousesResponse.ok) throw new Error('Failed to fetch warehouses');
      const warehousesData = await warehousesResponse.json();
      setWarehouses(warehousesData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // После рефакторинга все пользователи должны иметь клиента (clientId обязателен)
  // Клиенты уже содержат информацию о связанном пользователе через поле user
  const allItems = React.useMemo(() => {
    // Возвращаем только клиентов, так как теперь каждый User связан с Client
    // и все данные хранятся в Client
    return clients;
  }, [clients]);

  const filteredClients = allItems.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.fullName.toLowerCase().includes(searchLower) ||
      client.user?.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleUserChange = async (
    userId: string,
    field: keyof UserItem,
    value: string | number | null | boolean
  ) => {
    const prev = users.find((u) => u.id === userId)?.[field];
    
    // Оптимистично обновляем UI
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
    );

    try {
      // Отправляем обновление на сервер
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        throw new Error('Failed to update user');
      }

      toast.success("Данные обновлены");
      
      // Перезагружаем данные, чтобы синхронизировать users и clients
      await fetchData();
    } catch {
      // При ошибке откатываем изменения
      toast.error("Ошибка при обновлении");
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, [field]: prev } : u
        )
      );
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Вы уверены, что хотите удалить клиента "${client.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Ошибка удаления клиента');
        return;
      }

      toast.success('Клиент успешно удален');
      fetchData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Ошибка удаления клиента');
    }
  };

  const handleEditUser = (user: UserItem | { id: string; name: string | null; email: string; phone?: string | null; address?: string | null; role: string; priceAccessId?: number | null; warehouseAccessId?: number | null; isConfirmed: boolean }) => {
    const userItem: UserItem = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      address: user.address || null,
      role: user.role,
      priceAccessId: user.priceAccessId ?? null,
      warehouseAccessId: user.warehouseAccessId ?? null,
      isConfirmed: user.isConfirmed,
    };
    setSelectedUser(userItem);
    setIsEditUserModalOpen(true);
  };

  const handleDeleteUser = async (user: UserItem | { id: string; name: string | null; email: string }) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${user.name || user.email}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Ошибка удаления пользователя');
        return;
      }

      toast.success('Пользователь успешно удален');
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Ошибка удаления пользователя');
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">Клиенты и пользователи</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Управление клиентами и авторизованными пользователями
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Добавить клиента</span>
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <Shield className="mr-2 h-4 w-4" />
            Пользователи ({users.length})
          </TabsTrigger>
          <TabsTrigger value="clients">
            <User className="mr-2 h-4 w-4" />
            Все клиенты ({allItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Вкладка Пользователи */}
        <TabsContent value="users" className="space-y-4">
          {/* Таблица - только десктоп */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Роль
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Тип цены
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Database className="h-4 w-4" />
                      База
                    </div>
                  </TableHead>
                  <TableHead>Подтвержден</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Пользователи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Input
                          value={user.name ?? ""}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id
                                  ? { ...u, name: e.target.value }
                                  : u
                              )
                            )
                          }
                          onBlur={(e) =>
                            handleUserChange(user.id, "name", e.target.value)
                          }
                          placeholder="Введите имя"
                          className="w-[180px]"
                        />
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone ?? "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(val) =>
                            handleUserChange(user.id, "role", val)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.priceAccessId?.toString() ?? "none"}
                          onValueChange={(val) =>
                            handleUserChange(
                              user.id,
                              "priceAccessId",
                              val === "none" ? null : Number(val)
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {priceTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.warehouseAccessId?.toString() ?? "none"}
                          onValueChange={(val) =>
                            handleUserChange(
                              user.id,
                              "warehouseAccessId",
                              val === "none" ? null : Number(val)
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Выберите базу" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {warehouses.map((warehouse) => (
                              <SelectItem
                                key={warehouse.id}
                                value={warehouse.id.toString()}
                              >
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.isConfirmed}
                          onCheckedChange={(val) =>
                            handleUserChange(user.id, "isConfirmed", val)
                          }
                        />
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
            ) : users.length === 0 ? (
              <div className="text-center py-8">Пользователи не найдены</div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <div className="p-4 space-y-3">
                    {/* Заголовок карточки */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary" />
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </div>
                        <Input
                          value={user.name ?? ""}
                          onChange={(e) =>
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id ? { ...u, name: e.target.value } : u
                              )
                            )
                          }
                          onBlur={(e) => handleUserChange(user.id, "name", e.target.value)}
                          placeholder="Введите имя"
                          className="text-base font-semibold"
                        />
                      </div>
                      <Switch
                        checked={user.isConfirmed}
                        onCheckedChange={(val) => handleUserChange(user.id, "isConfirmed", val)}
                      />
                    </div>

                    {/* Контакты */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="line-clamp-2">{user.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Селекторы */}
                    <div className="pt-3 border-t space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Shield className="h-3 w-3" />
                          Роль
                        </Label>
                        <Select
                          value={user.role}
                          onValueChange={(val) => handleUserChange(user.id, "role", val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Tag className="h-3 w-3" />
                          Тип цены
                        </Label>
                        <Select
                          value={user.priceAccessId?.toString() ?? "none"}
                          onValueChange={(val) =>
                            handleUserChange(
                              user.id,
                              "priceAccessId",
                              val === "none" ? null : Number(val)
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {priceTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <Database className="h-3 w-3" />
                          База
                        </Label>
                        <Select
                          value={user.warehouseAccessId?.toString() ?? "none"}
                          onValueChange={(val) =>
                            handleUserChange(
                              user.id,
                              "warehouseAccessId",
                              val === "none" ? null : Number(val)
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выберите базу" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Вкладка Все клиенты */}
        <TabsContent value="clients" className="space-y-4">

      {/* Поиск - только десктоп */}
      <div className="hidden md:flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Всего записей</div>
              <div className="text-2xl font-bold">{allItems.length}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Пользователи (авторизованы)</div>
              <div className="text-2xl font-bold text-green-600">
                {allItems.filter((c) => c.user).length}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Только клиенты</div>
              <div className="text-2xl font-bold text-orange-600">
                {allItems.filter((c) => !c.user).length}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">С email</div>
              <div className="text-2xl font-bold">
                {allItems.filter((c) => c.user?.email).length}
              </div>
            </div>
          </div>

          {/* Таблица - только десктоп */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Клиент
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Контакты
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Адрес
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Тип цены
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      Авторизация
                    </div>
                  </TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Клиенты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.fullName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.user?.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{client.user.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {!client.user?.email && !client.phone && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.address || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.priceAccess ? (
                          <Badge variant="outline">{client.priceAccess.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.user ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <div>
                              <Badge variant="default" className="bg-green-600">
                                Авторизован
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {client.user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4 text-orange-600" />
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                              Не авторизован
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(client.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {client.user ? (
                            // Кнопки для авторизованного пользователя
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser({
                                  id: client.user!.id,
                                  name: client.name,
                                  email: client.user!.email,
                                  phone: client.phone,
                                  address: client.address,
                                  role: client.user!.role,
                                  priceAccessId: client.priceAccessId,
                                  warehouseAccessId: client.warehouseAccessId,
                                  isConfirmed: client.user!.isConfirmed,
                                })}
                                title="Редактировать"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser({
                                  id: client.user!.id,
                                  name: client.name,
                                  email: client.user!.email,
                                })}
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : !client.id.startsWith('user_') ? (
                            // Кнопки для клиента без авторизации
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClient(client)}
                                title="Редактировать"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClient(client)}
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : null}
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
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">Клиенты не найдены</div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id} className="border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <div className="p-4 space-y-3">
                    {/* Заголовок карточки */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate" title={client.name}>
                          {client.name}
                        </h3>
                        {client.fullName && (
                          <p className="text-sm text-muted-foreground truncate" title={client.fullName}>
                            {client.fullName}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {client.user ? (
                          <UserCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                    </div>

                    {/* Контакты */}
                    <div className="space-y-2">
                      {client.user?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{client.user.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="line-clamp-2">{client.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Тип цены и авторизация */}
                    <div className="pt-3 border-t space-y-2">
                      {client.priceAccess && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{client.priceAccess.name}</Badge>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {client.user ? (
                            <>
                              <LinkIcon className="h-4 w-4 text-green-600" />
                              <Badge variant="default" className="bg-green-600">
                                Авторизован
                              </Badge>
                            </>
                          ) : (
                            <>
                              <LinkIcon className="h-4 w-4 text-orange-600" />
                              <Badge variant="outline" className="border-orange-300 text-orange-600">
                                Не авторизован
                              </Badge>
                            </>
                          )}
                        </div>
                        {/* Действия */}
                        <div className="flex items-center gap-1">
                          {client.user ? (
                            // Кнопки для авторизованного пользователя
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser({
                                  id: client.user!.id,
                                  name: client.name,
                                  email: client.user!.email,
                                  phone: client.phone,
                                  address: client.address,
                                  role: client.user!.role,
                                  priceAccessId: client.priceAccessId,
                                  warehouseAccessId: client.warehouseAccessId,
                                  isConfirmed: client.user!.isConfirmed,
                                })}
                                title="Редактировать"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser({
                                  id: client.user!.id,
                                  name: client.name,
                                  email: client.user!.email,
                                })}
                                title="Удалить"
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : !client.id.startsWith('user_') ? (
                            // Кнопки для клиента без авторизации
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClient(client)}
                                title="Редактировать"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClient(client)}
                                title="Удалить"
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Создан: {formatDate(client.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Плавающая кнопка поиска (только мобильные) */}
      {!showFilters && (
        <div className="md:hidden fixed bottom-6 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Button
            size="lg"
            onClick={() => setShowFiltersModal(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <Search className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Модальное окно поиска (только мобильные) */}
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
                <Search className="w-5 h-5 text-primary" />
                Поиск
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
            <div className="px-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="modal-search" className="text-sm font-semibold">Поиск клиента</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="modal-search"
                    placeholder="Поиск по имени, email, телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    autoFocus={false}
                  />
                </div>
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
              }}
            >
              Сбросить
            </Button>
            <Button 
              className="flex-1"
              onClick={() => setShowFiltersModal(false)}
            >
              Применить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно создания клиента */}
      <ClientModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          fetchData();
        }}
        priceTypes={priceTypes}
        warehouses={warehouses}
      />

      {/* Модальное окно редактирования клиента */}
      <ClientModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedClient(null);
          fetchData();
        }}
        priceTypes={priceTypes}
        warehouses={warehouses}
        client={selectedClient}
      />

      {/* Модальное окно редактирования пользователя */}
      <UserModal
        open={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
          fetchData();
        }}
        priceTypes={priceTypes}
        warehouses={warehouses}
        user={selectedUser}
      />
    </div>
  );
}

