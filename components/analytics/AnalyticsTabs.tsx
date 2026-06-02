'use client';

import { useState } from 'react';
import { ActivityOverviewTable } from './ActivityOverviewTable';
import ActivityReport from './ActivityReport';
import MarketOverview from './MarketOverview';
import ClientAnalytics from './ClientAnalytics';
import ProductAnalytics from './ProductAnalytics';
import OrdersReport from '@/components/orders/OrdersReport';

interface UserRow {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  totalEvents: number;
  _count: { activitySessions: number };
  activitySessions: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    _count: { events: number };
  }[];
}

interface Props {
  users: UserRow[];
}

export function AnalyticsTabs({ users }: Props) {
  const [tab, setTab] = useState<
    'market' | 'orders' | 'client' | 'product' | 'activity' | 'activity-report'
  >('market');

  const tabs = [
    { key: 'market', label: 'Обзор рынка' },
    { key: 'orders', label: 'Отчёт по заказам' },
    { key: 'client', label: 'По клиенту' },
    { key: 'product', label: 'По товару' },
    { key: 'activity', label: 'Активность' },
    { key: 'activity-report', label: 'Отчёт по активности' },
  ] as const;

  return (
    <>
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
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

      <div className="mt-4">
        {tab === 'market' && <MarketOverview />}
        {tab === 'orders' && <OrdersReport />}
        {tab === 'client' && <ClientAnalytics />}
        {tab === 'product' && <ProductAnalytics />}
        {tab === 'activity' && <ActivityOverviewTable users={users} />}
        {tab === 'activity-report' && <ActivityReport />}
      </div>
    </>
  );
}
