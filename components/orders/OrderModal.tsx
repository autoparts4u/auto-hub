'use client';

import { useState, useEffect, useMemo } from 'react';
import { Client, OrderStatus, DeliveryMethod, CreateOrderItemDTO } from '@/app/types/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  statuses: OrderStatus[];
}

interface Autopart {
  id: string;
  article: string;
  description: string;
  brand?: { name: string };
  warehouses?: {
    warehouse_id: number;
    quantity: number;
    warehouse: {
      id: number;
      name: string;
    };
  }[];
  prices?: {
    autopart_id: string;
    pricesType_id: number;
    price: number;
    priceType: {
      id: number;
      name: string;
    };
  }[];
}

interface Warehouse {
  id: number;
  name: string;
}

export default function OrderModal({
  open,
  onClose,
  clients,
  statuses,
}: OrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [deliveryMethodId, setDeliveryMethodId] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discount, setDiscount] = useState(0);

  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [autoparts, setAutoparts] = useState<Autopart[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<CreateOrderItemDTO[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAutopartId, setSelectedAutopartId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (open) {
      fetchAutoparts();
      fetchWarehouses();
      fetchDeliveryMethods();

      // Читаем дефолты из настроек
      fetch('/api/settings')
        .then(r => r.json())
        .then(defaults => {
          if (defaults.defaultOrderStatusId) {
            setStatusId(defaults.defaultOrderStatusId.toString());
          } else {
            const newStatus = statuses.find(s => s.name === 'Новый');
            if (newStatus) setStatusId(newStatus.id.toString());
          }
          if (defaults.defaultDeliveryMethodId) {
            setDeliveryMethodId(defaults.defaultDeliveryMethodId.toString());
          }
        })
        .catch(() => {
          const newStatus = statuses.find(s => s.name === 'Новый');
          if (newStatus) setStatusId(newStatus.id.toString());
        });
    }
  }, [open, statuses]);

  useEffect(() => {
    if (clientId) {
      fetchDeliveryMethods(clientId);
      // Автоматически заполняем адрес доставки адресом клиента
      const client = clients.find(c => c.id === clientId);
      if (client?.address) {
        setDeliveryAddress(client.address);
      }
    }
  }, [clientId, clients]);

  const fetchAutoparts = async () => {
    try {
      const res = await fetch('/api/autoparts');
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded autoparts:', data.length, 'items');
        setAutoparts(data);
      } else {
        console.error('Failed to fetch autoparts:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error fetching autoparts:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchDeliveryMethods = async (clientId?: string) => {
    try {
      const url = clientId ? `/api/delivery-methods?clientId=${clientId}` : '/api/delivery-methods';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDeliveryMethods(data);
      }
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedAutopartId) {
      toast.error('Выберите запчасть');
      return;
    }
    if (!selectedWarehouseId) {
      toast.error('Выберите склад');
      return;
    }
    if (quantity <= 0) {
      toast.error('Укажите количество больше 0');
      return;
    }
    if (price <= 0) {
      toast.error('Укажите цену больше 0');
      return;
    }

    const newItem: CreateOrderItemDTO = {
      autopart_id: selectedAutopartId,
      warehouse_id: parseInt(selectedWarehouseId),
      quantity,
      item_final_price: price,
    };

    setItems([...items, newItem]);
    toast.success('Позиция добавлена');

    // Сброс полей (склад оставляем — дефолт для следующей детали)
    setSelectedAutopartId('');
    setQuantity(1);
    setPrice(0);
    setSearchTerm('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'item_final_price', value: number) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.item_final_price * item.quantity, 0);
    return subtotal - discount;
  };

  const handleSubmit = async () => {
    if (!clientId || !statusId || items.length === 0) {
      toast.error('Заполните обязательные поля и добавьте хотя бы одну позицию');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        client_id: clientId,
        orderStatus_id: parseInt(statusId),
        deliveryMethod_id: deliveryMethodId && deliveryMethodId !== 'none' ? parseInt(deliveryMethodId) : undefined,
        notes,
        deliveryAddress,
        discount,
        items,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        toast.success('Заказ успешно создан');
        handleClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Ошибка создания заказа');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClientId('');
    setStatusId('');
    setDeliveryMethodId('');
    setNotes('');
    setDeliveryAddress('');
    setDiscount(0);
    setItems([]);
    setSearchTerm('');
    setSelectedAutopartId('');
    setSelectedWarehouseId('');
    setQuantity(1);
    setPrice(0);
    onClose();
  };

  const getAutopartDisplay = (autopartId: string) => {
    const autopart = autoparts.find(a => a.id === autopartId);
    if (!autopart) return 'Неизвестная запчасть';
    return `${autopart.article} - ${autopart.description}`;
  };

  const getSelectedAutopartName = () => {
    if (!selectedAutopartId) return null;
    const autopart = autoparts.find(a => a.id === selectedAutopartId);
    if (!autopart) return null;
    return autopart.article;
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || 'Неизвестный склад';
  };

  const getAutopartQuantityInWarehouse = (autopartId: string, warehouseId: number): number => {
    const autopart = autoparts.find(ap => ap.id === autopartId);
    if (!autopart || !autopart.warehouses) return 0;
    
    const warehouseStock = autopart.warehouses.find(w => w.warehouse_id === warehouseId);
    return warehouseStock?.quantity || 0;
  };

  const filteredAutoparts = useMemo(() => {
    const result = searchTerm.trim() 
      ? autoparts.filter(ap =>
          ap.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ap.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : autoparts.slice(0, 100); // Показываем первые 100 запчастей, если нет поиска
    
    console.log('Filtered autoparts:', result.length, 'items (search:', searchTerm, ')');
    return result;
  }, [autoparts, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Создать новый заказ</DialogTitle>
          <DialogDescription>
            Заполните информацию о заказе и добавьте позиции
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
        <div className="space-y-6 py-2">
          {/* Основная информация */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Клиент *</Label>
              <Select 
                value={clientId} 
                onValueChange={(value) => {
                  setClientId(value);
                  
                  // Обновляем цену при изменении клиента (если запчасть уже выбрана)
                  if (selectedAutopartId) {
                    const selectedAutopart = autoparts.find(a => a.id === selectedAutopartId);
                    const selectedClient = clients.find(c => c.id === value);
                    
                    if (selectedAutopart && selectedClient && selectedClient.priceAccessId && selectedAutopart.prices) {
                      const matchingPrice = selectedAutopart.prices.find(
                        p => p.pricesType_id === selectedClient.priceAccessId
                      );
                      
                      if (matchingPrice) {
                        setPrice(matchingPrice.price);
                        console.log(`Цена обновлена для нового клиента: ${matchingPrice.price} (тип: ${matchingPrice.priceType.name})`);
                      } else {
                        setPrice(0);
                        console.log('Цена для данного типа не найдена у нового клиента');
                      }
                    }
                  }
                }}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        {client.priceAccess && (
                          <span className="text-xs text-muted-foreground">
                            Тип цены: {client.priceAccess.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус *</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.hexColor }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">Способ доставки</Label>
              <Select value={deliveryMethodId} onValueChange={setDeliveryMethodId}>
                <SelectTrigger id="deliveryMethod">
                  <SelectValue placeholder="Выберите способ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
                  {deliveryMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Скидка</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                onFocus={(e) => {
                  if (discount === 0) {
                    e.target.value = '';
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setDiscount(0);
                  }
                }}
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Адрес доставки</Label>
            <Input
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Введите адрес доставки"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация о заказе"
              rows={3}
            />
          </div>

          {/* Добавление позиций */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Добавить позицию в заказ
            </h3>
            
            {/* Запчасть - на всю ширину */}
            <div className="space-y-2">
              <Label htmlFor="autopart-select">Запчасть *</Label>
              <Select 
                value={selectedAutopartId} 
                onValueChange={(value) => {
                  setSelectedAutopartId(value);
                  setSearchTerm('');
                  
                  // Автоматический подбор цены
                  const selectedAutopart = autoparts.find(a => a.id === value);
                  const selectedClient = clients.find(c => c.id === clientId);
                  
                  if (selectedAutopart && selectedClient && selectedClient.priceAccessId && selectedAutopart.prices) {
                    const matchingPrice = selectedAutopart.prices.find(
                      p => p.pricesType_id === selectedClient.priceAccessId
                    );
                    
                    if (matchingPrice) {
                      setPrice(matchingPrice.price);
                      console.log(`Автоматически установлена цена: ${matchingPrice.price} (тип: ${matchingPrice.priceType.name})`);
                    } else {
                      // Если нет соответствующей цены, устанавливаем 0
                      setPrice(0);
                      console.log('Цена для данного типа не найдена');
                    }
                  } else {
                    setPrice(0);
                  }
                }}
              >
                <SelectTrigger 
                  id="autopart-select"
                  className={!selectedAutopartId ? "border-orange-300" : ""}
                >
                  {selectedAutopartId ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getSelectedAutopartName()}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">🔍 Начните вводить артикул...</span>
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-[300px] w-full">
                  <div className="sticky top-0 bg-background p-2 border-b z-50">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Поиск по артикулу или описанию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                  {filteredAutoparts.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {searchTerm ? 'Ничего не найдено' : 'Нет доступных запчастей'}
                    </div>
                  ) : (
                    <div className="max-h-[250px] overflow-y-auto">
                      {filteredAutoparts.map((autopart) => (
                        <SelectItem key={autopart.id} value={autopart.id}>
                          <div className="text-sm py-1">
                            <div className="font-medium">{autopart.article}</div>
                            <div className="text-muted-foreground text-xs truncate max-w-[350px]">
                              {autopart.description}
                              {autopart.brand && <span className="ml-2 text-primary">• {autopart.brand.name}</span>}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Склад - на всю ширину чтобы избежать перекрытия */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">Склад *</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger id="warehouse" className={!selectedWarehouseId ? "border-orange-300" : ""}>
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {warehouses.map((warehouse) => {
                    const quantity = selectedAutopartId 
                      ? getAutopartQuantityInWarehouse(selectedAutopartId, warehouse.id)
                      : null;
                    
                    return (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{warehouse.name}</span>
                          {quantity !== null && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              quantity > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                            }`}>
                              {quantity} шт
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Количество и Цена в одну строку */}
            <div className="grid grid-cols-2 gap-4">
              {/* Количество */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Кол-во *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Разрешаем пустое значение во время ввода
                    if (value === '') {
                      setQuantity(0);
                    } else {
                      setQuantity(parseInt(value) || 0);
                    }
                  }}
                  onFocus={(e) => {
                    // Очищаем поле если там 0 или 1 (по умолчанию)
                    if (quantity === 0 || quantity === 1) {
                      e.target.select();
                    }
                  }}
                  onBlur={() => {
                    // При потере фокуса, если 0 или пусто - ставим 1
                    if (quantity <= 0) {
                      setQuantity(1);
                    }
                  }}
                  min="1"
                  className={quantity <= 0 ? "border-orange-300" : ""}
                />
              </div>

              {/* Цена */}
              <div className="space-y-2">
                <Label htmlFor="price">Цена *</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => {
                    if (price === 0) {
                      e.target.value = '';
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setPrice(0);
                    }
                  }}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={price <= 0 ? "border-orange-300" : ""}
                />
              </div>
            </div>

            <Button 
              onClick={handleAddItem} 
              className="w-full" 
              type="button"
              variant={selectedAutopartId && selectedWarehouseId && quantity > 0 && price > 0 ? "default" : "outline"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Добавить позицию
            </Button>
            {(!selectedAutopartId || !selectedWarehouseId || quantity <= 0 || price <= 0) && (
              <p className="text-xs text-muted-foreground text-center">
                Заполните все поля для добавления позиции
              </p>
            )}
          </div>

          {/* Список позиций */}
          {items.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Позиции заказа ({items.length})</h3>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {getAutopartDisplay(item.autopart_id)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Склад: {getWarehouseName(item.warehouse_id)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Кол-во</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Цена</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.item_final_price}
                          onChange={(e) => handleUpdateItem(index, 'item_final_price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Сумма</label>
                        <div className="h-8 flex items-center font-semibold text-sm">
                          {(item.item_final_price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Подытог:</span>
                  <span>{items.reduce((sum, item) => sum + item.item_final_price * item.quantity, 0).toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Скидка:</span>
                    <span>-{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span>{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
            {loading ? 'Создание...' : 'Создать заказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

