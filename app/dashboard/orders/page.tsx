'use client';

import { useState } from 'react';
import OrdersTable from '@/components/orders/OrdersTable';
import PurchasesTable from '@/components/purchases/PurchasesTable';

export default function OrdersPage() {
  const [tab, setTab] = useState<'orders' | 'purchases'>('orders');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
      <div className="flex gap-1 border-b mb-2">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('orders')}
        >
          Заказы
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'purchases'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('purchases')}
        >
          Поступления
        </button>
      </div>

      {tab === 'orders' ? <OrdersTable /> : <PurchasesTable />}
    </div>
  );
}
