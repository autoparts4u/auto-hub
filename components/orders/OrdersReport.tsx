'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, TrendingUp, ShoppingCart, CreditCard, AlertCircle } from 'lucide-react';

// ---- Types ----

interface ReportData {
  period: { days: number; from: string; to: string };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    paidRevenue: number;
    debt: number;
    newClients: number;
  };
  byStatus: {
    statusId: number;
    statusName: string;
    hexColor: string;
    count: number;
    revenue: number;
  }[];
  trend: { date: string; orders: number; revenue: number }[];
  topClients: {
    clientId: string;
    clientName: string;
    orderCount: number;
    revenue: number;
    paidAmount: number;
  }[];
  topProducts: {
    article: string;
    description: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  paymentBreakdown: { paid: number; partial: number; unpaid: number };
}

// ---- Helpers ----

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

const PERIOD_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '14 дней', value: 14 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Полгода', value: 180 },
  { label: 'Год', value: 365 },
];

const PAYMENT_COLORS = {
  paid: '#22c55e',
  partial: '#f97316',
  unpaid: '#ef4444',
};

// ---- Skeleton loader ----

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="py-4">
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      </div>
      {/* Tables row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="py-4">
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Main Component ----

interface OrdersReportProps {
  onClose?: () => void;
}

export default function OrdersReport({ onClose }: OrdersReportProps) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/orders?days=${d}`);
      if (!res.ok) throw new Error('Ошибка загрузки отчёта');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(days);
  }, [days, fetchReport]);

  const paymentPieData = data
    ? [
        { name: 'Оплачено', value: data.paymentBreakdown.paid, color: PAYMENT_COLORS.paid },
        { name: 'Частично', value: data.paymentBreakdown.partial, color: PAYMENT_COLORS.partial },
        { name: 'Не оплачено', value: data.paymentBreakdown.unpaid, color: PAYMENT_COLORS.unpaid },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <div className="space-y-6 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold">Отчёт по заказам</h3>
          <p className="text-sm text-muted-foreground">
            {data
              ? `${new Date(data.period.from).toLocaleDateString('ru-RU')} — ${new Date(data.period.to).toLocaleDateString('ru-RU')}`
              : 'Загрузка...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center border rounded-md overflow-hidden">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Закрыть отчёт">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-4 border border-destructive/30 rounded-lg bg-destructive/10">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <ReportSkeleton />}

      {/* Content */}
      {!loading && data && (
        <div className="space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total orders */}
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4" />
                  Заказов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.totalOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{data.summary.newClients} новых клиентов
                </p>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Выручка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.summary.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Оплачено: {fmt(data.summary.paidRevenue)}
                </p>
              </CardContent>
            </Card>

            {/* Average order */}
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  Средний чек
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.summary.avgOrderValue)}</p>
              </CardContent>
            </Card>

            {/* Debt */}
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Долг
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    data.summary.debt > 0 ? 'text-orange-500' : 'text-green-500'
                  }`}
                >
                  {fmt(data.summary.debt)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Неоплаченные заказы
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Line chart - sales trend */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-base">Динамика продаж</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      interval={Math.max(0, Math.floor(data.trend.length / 7) - 1)}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={50} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={30} />
                    <Tooltip
                      formatter={(value, name) => {
                        const v = typeof value === 'number' ? value : 0;
                        return name === 'Выручка' ? fmt(v) : v;
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Выручка"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Заказы"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart - payment */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-base">Оплата</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={true}
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Tables Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top clients */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-base">Топ клиентов</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topClients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Клиент</th>
                          <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Заказов</th>
                          <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Выручка</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Оплачено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClients.map((c) => (
                          <tr key={c.clientId} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2 pr-3 font-medium max-w-[120px] truncate">{c.clientName}</td>
                            <td className="py-2 pr-3 text-right text-muted-foreground">{c.orderCount}</td>
                            <td className="py-2 pr-3 text-right">{fmt(c.revenue)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(c.paidAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Top products */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-base">Топ запчастей</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Артикул</th>
                          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Описание</th>
                          <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Кол-во</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Выручка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.map((p) => (
                          <tr key={p.article} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="py-2 pr-3 font-mono text-xs">{p.article}</td>
                            <td className="py-2 pr-3 text-muted-foreground max-w-[130px] truncate" title={p.description}>
                              {p.description}
                            </td>
                            <td className="py-2 pr-3 text-right font-medium">{p.totalQuantity}</td>
                            <td className="py-2 text-right">{fmt(p.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Нет данных</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Status Bar Chart ── */}
          {data.byStatus.length > 0 && (
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-base">Заказы по статусам</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byStatus} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="statusName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip
                      formatter={(value) => {
                        const v = typeof value === 'number' ? value : 0;
                        return fmt(v);
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof data.byStatus)[0];
                        return (
                          <div className="bg-background border rounded-lg p-3 text-sm shadow-md">
                            <p className="font-medium mb-1">{d.statusName}</p>
                            <p>Заказов: {d.count}</p>
                            <p>Выручка: {fmt(d.revenue)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Заказов" radius={[4, 4, 0, 0]}>
                      {data.byStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.hexColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
