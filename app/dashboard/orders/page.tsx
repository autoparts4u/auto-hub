'use client';

import { useState } from 'react';
import OrdersTable from '@/components/orders/OrdersTable';
import PurchasesTable from '@/components/purchases/PurchasesTable';
import ReturnsTable from '@/components/orders/ReturnsTable';

type Tab = 'orders' | 'purchases' | 'returns';

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('orders');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Заказы' },
    { key: 'purchases', label: 'Поступления' },
    { key: 'returns', label: 'Возвраты' },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
      <div className="flex gap-1 border-b mb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersTable />}
      {tab === 'purchases' && <PurchasesTable />}
      {tab === 'returns' && <ReturnsTable />}
    </div>
  );
}
