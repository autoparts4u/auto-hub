'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OrdersTable from '@/components/orders/OrdersTable';
import PurchasesTable from '@/components/purchases/PurchasesTable';
import ReturnsTable from '@/components/orders/ReturnsTable';

type Tab = 'orders' | 'purchases' | 'returns';
const VALID_TABS: ReadonlyArray<Tab> = ['orders', 'purchases', 'returns'];

function parseTab(value: string | null): Tab {
  return value && (VALID_TABS as readonly string[]).includes(value) ? (value as Tab) : 'orders';
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(parseTab(searchParams.get('tab')));

  // Синхронизация URL ?tab=... → state (если URL изменился извне, например по навигации)
  useEffect(() => {
    const fromUrl = parseTab(searchParams.get('tab'));
    setTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  const handleTabChange = (next: Tab) => {
    setTab(next);
    // Сохраняем все прочие параметры (?dashboardPreset, ?purchasePreset, и т.п.).
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'orders') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/orders?${qs}` : '/dashboard/orders', { scroll: false });
  };

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
            onClick={() => handleTabChange(t.key)}
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
