'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ActivityOverviewTable } from './ActivityOverviewTable';

// Тяжёлые от recharts вкладки грузим лениво — recharts не попадает в первый
// бандл страницы аналитики и подтягивается только при открытии вкладки.
const TabLoader = () => (
  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
    Загрузка…
  </div>
);
const MarketOverview = dynamic(() => import('./MarketOverview'), { loading: TabLoader });
const OrdersReport = dynamic(() => import('@/components/orders/OrdersReport'), { loading: TabLoader });
const ClientAnalytics = dynamic(() => import('./ClientAnalytics'), { loading: TabLoader });
const ProductAnalytics = dynamic(() => import('./ProductAnalytics'), { loading: TabLoader });
const ActivityReport = dynamic(() => import('./ActivityReport'), { loading: TabLoader });

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
