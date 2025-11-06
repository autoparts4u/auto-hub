'use client';

import React, { useState, useEffect } from 'react';
import { Client, PriceType } from '@/app/types/orders';
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
} from 'lucide-react';
import { toast } from 'sonner';
import ClientModal from './ClientModal';

interface ClientsTableProps {
  priceTypes: PriceType[];
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  role: string;
  priceAccessId?: number | null;
  warehouseAccessId?: number | null;
  isConfirmed: boolean;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function ClientsTable({ priceTypes }: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем клиентов
      const clientsResponse = await fetch('/api/clients');
      if (!clientsResponse.ok) throw new Error('Failed to fetch clients');
      const clientsData = await clientsResponse.json();
      setClients(clientsData);

      // Загружаем пользователей
      const usersResponse = await fetch('/api/users');
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const usersData = await usersResponse.json();
      setUsers(usersData);

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

  // Объединяем клиентов и пользователей без клиента
  const allItems = React.useMemo(() => {
    // Получаем userId всех клиентов
    const clientUserIds = new Set(clients.filter(c => c.userId).map(c => c.userId));
    
    // Находим пользователей без клиента
    const usersWithoutClient = users.filter(user => !clientUserIds.has(user.id));
    
    // Преобразуем пользователей в формат клиентов для отображения
    const userAsClients: Client[] = usersWithoutClient.map(user => ({
      id: `user_${user.id}`, // Префикс для различения
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
      priceAccess: priceTypes.find(pt => pt.id === user.priceAccessId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    return [...clients, ...userAsClients];
  }, [clients, users, priceTypes]);

  const filteredClients = allItems.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.fullName.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
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
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
    );

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      toast.error("Ошибка при обновлении");
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, [field]: prev } : u
        )
      );
      return;
    }

    toast.success("Данные обновлены");
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Клиенты и пользователи</h1>
          <p className="text-muted-foreground">
            Управление клиентами и авторизованными пользователями
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить клиента
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
          <div className="border rounded-lg">
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
        </TabsContent>

        {/* Вкладка Все клиенты */}
        <TabsContent value="clients" className="space-y-4">

      {/* Поиск */}
      <div className="flex items-center gap-4">
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
          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Всего записей</div>
              <div className="text-2xl font-bold">{allItems.length}</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Пользователи (авторизованы)</div>
              <div className="text-2xl font-bold text-green-600">
                {allItems.filter((c) => c.userId).length}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Только клиенты</div>
              <div className="text-2xl font-bold text-orange-600">
                {allItems.filter((c) => !c.userId).length}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">С email</div>
              <div className="text-2xl font-bold">
                {allItems.filter((c) => c.email).length}
              </div>
            </div>
          </div>

          {/* Таблица */}
          <div className="border rounded-lg">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
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
                          {client.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {!client.email && !client.phone && (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Модальное окно создания клиента */}
      <ClientModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          fetchData();
        }}
        priceTypes={priceTypes}
      />
    </div>
  );
}

