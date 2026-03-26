'use client';

import { useState } from 'react';
import { ActivityOverviewTable } from './ActivityOverviewTable';
import ActivityReport from './ActivityReport';
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
  const [tab, setTab] = useState<'activity' | 'activity-report' | 'orders'>('activity');

  const tabs = [
    { key: 'activity', label: 'Активность' },
    { key: 'activity-report', label: 'Отчёт по активности' },
    { key: 'orders', label: 'Отчёт по заказам' },
  ] as const;

  return (
    <>
      <div className="flex gap-1 border-b">
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

      {tab === 'activity' && <ActivityOverviewTable users={users} />}
      {tab === 'activity-report' && <ActivityReport />}
      {tab === 'orders' && <OrdersReport />}
    </>
  );
}
