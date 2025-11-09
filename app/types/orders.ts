// Типы для системы заказов

export interface Order {
  id: string;
  client_id: string;
  deliveryMethod_id: number | null;
  orderStatus_id: number;
  totalAmount: number | null;
  discount: number;
  paidAmount: number;
  notes: string | null;
  deliveryAddress: string | null;
  trackingNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  issuedAt: Date | string | null;
  paidAt: Date | string | null;
  
  // Связанные данные
  client?: Client;
  deliveryMethod?: DeliveryMethod;
  orderStatus?: OrderStatus;
  orderItems?: OrderItem[];
  statusHistory?: OrderStatusHistoryItem[];
}

export interface OrderItem {
  id: number;
  order_id: string;
  autopart_id: string | null;
  warehouse_id: number;
  quantity: number;
  item_final_price: number;
  article: string;
  description: string;
  
  // Связанные данные
  autopart?: {
    id: string;
    article: string;
    description: string;
    brand?: { name: string };
  } | null;
  warehouse?: {
    id: number;
    name: string;
  };
}

export interface OrderStatus {
  id: number;
  name: string;
  hexColor: string;
  isLast: boolean;
}

export interface OrderStatusHistoryItem {
  id: string;
  order_id: string;
  orderStatus_id: number;
  userId: string | null;
  comment: string | null;
  createdAt: Date | string;
  
  orderStatus?: OrderStatus;
  user?: {
    id: string;
    email: string;
    client?: {
      name: string;
      fullName: string;
    };
  };
}

export interface Client {
  id: string;
  name: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  priceAccessId: number | null;
  warehouseAccessId: number | null;
  deliveryMethods?: ClientDeliveryMethod[];
  priceAccess?: PriceType;
  warehouseAccess?: Warehouse;
  user?: {
    id: string;
    email: string;
    role: string;
    isConfirmed: boolean;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Warehouse {
  id: number;
  name: string;
  address: string;
}

export interface PriceType {
  id: number;
  name: string;
}

export interface ClientDeliveryMethod {
  client_id: string;
  deliveryMethod_id: number;
  deliveryMethod?: DeliveryMethod;
}

export interface DeliveryMethod {
  id: number;
  name: string;
  hexColor: string | null;
}

// DTO для создания заказа
export interface CreateOrderDTO {
  client_id: string;
  deliveryMethod_id?: number;
  orderStatus_id: number;
  notes?: string;
  deliveryAddress?: string;
  discount?: number;
  items: CreateOrderItemDTO[];
}

export interface CreateOrderItemDTO {
  autopart_id: string;
  warehouse_id: number;
  quantity: number;
  item_final_price: number;
}

// DTO для обновления заказа
export interface UpdateOrderDTO {
  client_id?: string;
  deliveryMethod_id?: number | null;
  orderStatus_id?: number;
  notes?: string;
  deliveryAddress?: string;
  trackingNumber?: string;
  discount?: number;
  totalAmount?: number;
  paidAmount?: number;
  issuedAt?: Date | string | null;
  paidAt?: Date | string | null;
}

// DTO для изменения статуса
export interface UpdateOrderStatusDTO {
  orderStatus_id: number;
  comment?: string;
}

// Фильтры для списка заказов
export interface OrderFilters {
  status?: number;
  client?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  unpaidIssued?: boolean; // Неоплаченные выданные заказы
}


