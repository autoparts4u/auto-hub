export interface PurchaseStatus {
  id: number;
  name: string;
  hexColor: string;
  isLast: boolean;
  _count?: { purchases: number };
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { purchases: number };
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrder_id: string;
  autopart_id: string | null;
  warehouse_id: number;
  quantity: number;
  purchase_price: number;
  article: string;
  description: string;
  autopart?: {
    id: string;
    article: string;
    description: string;
    brand?: { name: string } | null;
  } | null;
  warehouse?: { id: number; name: string } | null;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: number;
  purchaseStatus_id: number;
  totalAmount: number;
  notes: string | null;
  orderedAt: string;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
  purchaseStatus: PurchaseStatus;
  items: PurchaseOrderItem[];
  _count?: { items: number };
}

export interface CreatePurchaseDTO {
  supplier_id: number;
  purchaseStatus_id: number;
  notes?: string;
  orderedAt?: string;
  items: {
    autopart_id: string;
    warehouse_id: number;
    quantity: number;
    purchase_price: number;
  }[];
}
