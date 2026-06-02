'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AnalyticsCombobox } from './AnalyticsCombobox';
import { getContrastTextColor } from '@/lib/utils';
import { ShoppingCart, TrendingUp, CreditCard, AlertCircle, User } from 'lucide-react';

interface ClientHit {
  id: string;
  name: string;
  fullName: string;
  phone: string | null;
  _count?: { orders: number };
}

interface ReportData {
  client: { id: string; name: string; fullName: string; phone: string | null };
  period: { days: number; from: string; to: string };
  summary: {
    totalOrders: number;
    revenue: number;
    paidRevenue: number;
    debt: number;
    avgCheck: number;
    lifetimeOrders: number;
    lifetimeRevenue: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  trend: { date: string; orders: number; revenue: number }[];
  statusBreakdown: { statusName: string; hexColor: string; count: number }[];
  paymentBreakdown: { paid: number; partial: number; unpaid: number };
  topParts: { article: string; description: string; quantity: number; revenue: number }[];
  recentOrders: {
    id: string;
    createdAt: string;
    statusName: string;
    hexColor: string;
    net: number;
    paid: number;
    debt: number;
  }[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

const dateOnly = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

const PERIOD_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '14 дней', value: 14 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Полгода', value: 180 },
  { label: 'Год', value: 365 },
];

export default function ClientAnalytics() {
  const [selected, setSelected] = useState<ClientHit | null>(null);
  const [days, setDays] = useState(90);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchClients = useCallback(async (q: string): Promise<ClientHit[]> => {
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const all: ClientHit[] = await res.json();
    return all.slice(0, 25);
  }, []);

  const fetchReport = useCallback(async (clientId: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/client/${clientId}?days=${d}`);
      if (!res.ok) throw new Error('Ошибка загрузки аналитики клиента');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) fetchReport(selected.id, days);
  }, [selected, days, fetchReport]);

  return (
    <div className="space-y-6">
      {/* Selector + period */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AnalyticsCombobox<ClientHit>
          selectedLabel={selected ? selected.name : null}
          placeholder="Выберите клиента..."
          searchPlaceholder="Имя или ФИО клиента..."
          emptyText="Клиенты не найдены"
          onSearch={searchClients}
          getKey={(c) => c.id}
          onSelect={setSelected}
          renderItem={(c) => (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{c.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {c.fullName}
                {c.phone ? ` · ${c.phone}` : ''}
                {c._count ? ` · ${c._count.orders} зак.` : ''}
              </span>
            </span>
          )}
        />
        {selected && (
          <div className="flex flex-wrap items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  days === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <User className="h-8 w-8 opacity-40" />
          <p className="text-sm">Выберите клиента, чтобы увидеть его покупки и динамику</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="py-4"><CardContent className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-28" /></CardContent></Card>
            ))}
          </div>
          <Card className="py-4"><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4" /> Заказов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.totalOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">за всё время: {data.summary.lifetimeOrders}</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Выручка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.summary.revenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">оплачено: {fmt(data.summary.paidRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" /> Средний чек
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.summary.avgCheck)}</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Долг
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.summary.debt > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {fmt(data.summary.debt)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">текущий, за всё время</p>
              </CardContent>
            </Card>
          </div>

          {/* Meta */}
          <p className="text-xs text-muted-foreground">
            {data.client.fullName}
            {data.client.phone ? ` · ${data.client.phone}` : ''} · первый заказ {dateOnly(data.summary.firstOrderAt)} · последний {dateOnly(data.summary.lastOrderAt)} · всего {fmt(data.summary.lifetimeRevenue)}
          </p>

          {/* Trend */}
          <Card className="py-4">
            <CardHeader><CardTitle className="text-base">Динамика заказов</CardTitle></CardHeader>
            <CardContent>
              {data.trend.some((t) => t.orders > 0 || t.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.trend.length / 7) - 1)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={50} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                    <Tooltip formatter={(v, n) => (n === 'Выручка' ? fmt(typeof v === 'number' ? v : 0) : v)} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Выручка" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" name="Заказы" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Нет заказов за период</div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top parts */}
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Что покупает чаще всего</CardTitle></CardHeader>
              <CardContent>
                {data.topParts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Артикул</th>
                          <th className="text-left py-2 pr-3 font-medium">Описание</th>
                          <th className="text-right py-2 pr-3 font-medium">Кол-во</th>
                          <th className="text-right py-2 font-medium">Выручка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topParts.map((p) => (
                          <tr key={p.article} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2 pr-3 font-mono text-xs">{p.article}</td>
                            <td className="py-2 pr-3 text-muted-foreground max-w-[130px] truncate" title={p.description}>{p.description}</td>
                            <td className="py-2 pr-3 text-right font-medium">{p.quantity}</td>
                            <td className="py-2 text-right">{fmt(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Заказы по статусам</CardTitle></CardHeader>
              <CardContent>
                {data.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, data.statusBreakdown.length * 36)}>
                    <BarChart layout="vertical" data={data.statusBreakdown} margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="statusName" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" name="Заказов" radius={[0, 4, 4, 0]}>
                        {data.statusBreakdown.map((s, i) => (
                          <Cell key={i} fill={s.hexColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Нет данных</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent orders */}
          <Card className="py-4">
            <CardHeader><CardTitle className="text-base">Последние заказы за период</CardTitle></CardHeader>
            <CardContent>
              {data.recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Заказ</th>
                        <th className="text-left py-2 pr-3 font-medium">Дата</th>
                        <th className="text-left py-2 pr-3 font-medium">Статус</th>
                        <th className="text-right py-2 pr-3 font-medium">Сумма</th>
                        <th className="text-right py-2 pr-3 font-medium">Оплачено</th>
                        <th className="text-right py-2 font-medium">Долг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-3 font-mono text-xs">#{o.id.slice(-6)}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{dateOnly(o.createdAt)}</td>
                          <td className="py-2 pr-3">
                            <Badge style={{ backgroundColor: o.hexColor, color: getContrastTextColor(o.hexColor) }}>
                              {o.statusName}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-right">{fmt(o.net)}</td>
                          <td className="py-2 pr-3 text-right text-green-600">{fmt(o.paid)}</td>
                          <td className={`py-2 text-right font-medium ${o.debt > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{fmt(o.debt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">Нет заказов за период</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
