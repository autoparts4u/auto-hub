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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsCombobox } from './AnalyticsCombobox';
import { Package, TrendingUp, Boxes, Undo2, AlertCircle } from 'lucide-react';

interface PartHit {
  id: string;
  article: string;
  description: string;
  brand?: { name: string } | null;
}

interface ReportData {
  product: { id: string; article: string; description: string; brand: string | null };
  period: { days: number; from: string; to: string };
  summary: {
    soldQty: number;
    revenue: number;
    orderCount: number;
    avgPrice: number;
    totalStock: number;
    activeReserved: number;
    returnedQty: number;
    lifetimeSoldQty: number;
  };
  trend: { date: string; qty: number; revenue: number }[];
  topClients: { clientId: string; clientName: string; qty: number; revenue: number }[];
  stockByWarehouse: { warehouseName: string; quantity: number }[];
  reservations: { qty: number; count: number };
  returns: { count: number; qty: number; reasons: { reason: string; count: number }[] };
}

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

export default function ProductAnalytics() {
  const [selected, setSelected] = useState<PartHit | null>(null);
  const [days, setDays] = useState(90);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParts = useCallback(async (q: string): Promise<PartHit[]> => {
    const res = await fetch(`/api/autoparts/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    return res.json();
  }, []);

  const fetchReport = useCallback(async (id: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/product/${id}?days=${d}`);
      if (!res.ok) throw new Error('Ошибка загрузки аналитики товара');
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
        <AnalyticsCombobox<PartHit>
          selectedLabel={selected ? selected.article : null}
          placeholder="Выберите деталь..."
          searchPlaceholder="Артикул или описание..."
          emptyText="Детали не найдены"
          onSearch={searchParts}
          getKey={(p) => p.id}
          onSelect={setSelected}
          renderItem={(p) => (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium font-mono">{p.article}</span>
              <span className="truncate text-xs text-muted-foreground">
                {p.description}
                {p.brand ? ` · ${p.brand.name}` : ''}
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
          <Package className="h-8 w-8 opacity-40" />
          <p className="text-sm">Выберите деталь, чтобы увидеть продажи, остатки и возвраты</p>
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
          {/* Meta */}
          <p className="text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{data.product.article}</span> · {data.product.description}
            {data.product.brand ? ` · ${data.product.brand}` : ''}
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-4 w-4" /> Продано
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.soldQty} <span className="text-base font-normal text-muted-foreground">шт.</span></p>
                <p className="text-xs text-muted-foreground mt-1">за всё время: {data.summary.lifetimeSoldQty}</p>
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
                <p className="text-xs text-muted-foreground mt-1">ср. цена: {fmt(data.summary.avgPrice)} · {data.summary.orderCount} зак.</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Boxes className="h-4 w-4" /> Остаток
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.summary.totalStock <= 0 ? 'text-orange-500' : ''}`}>{data.summary.totalStock} <span className="text-base font-normal text-muted-foreground">шт.</span></p>
                <p className="text-xs text-muted-foreground mt-1">в брони: {data.summary.activeReserved}</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Undo2 className="h-4 w-4" /> Возвраты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.returns.qty > 0 ? 'text-orange-500' : 'text-green-500'}`}>{data.returns.qty} <span className="text-base font-normal text-muted-foreground">шт.</span></p>
                <p className="text-xs text-muted-foreground mt-1">{data.returns.count} возвратов за период</p>
              </CardContent>
            </Card>
          </div>

          {/* Trend */}
          <Card className="py-4">
            <CardHeader><CardTitle className="text-base">Динамика продаж</CardTitle></CardHeader>
            <CardContent>
              {data.trend.some((t) => t.qty > 0 || t.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.trend.length / 7) - 1)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={50} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                    <Tooltip formatter={(v, n) => (n === 'Выручка' ? fmt(typeof v === 'number' ? v : 0) : v)} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Выручка" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="qty" name="Штуки" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Нет продаж за период</div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Who buys */}
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Кто покупает</CardTitle></CardHeader>
              <CardContent>
                {data.topClients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Клиент</th>
                          <th className="text-right py-2 pr-3 font-medium">Штук</th>
                          <th className="text-right py-2 font-medium">Выручка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClients.map((c) => (
                          <tr key={c.clientId} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2 pr-3 font-medium max-w-[160px] truncate">{c.clientName}</td>
                            <td className="py-2 pr-3 text-right">{c.qty}</td>
                            <td className="py-2 text-right">{fmt(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Нет продаж за период</p>
                )}
              </CardContent>
            </Card>

            {/* Stock by warehouse */}
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Остатки по складам</CardTitle></CardHeader>
              <CardContent>
                {data.stockByWarehouse.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, data.stockByWarehouse.length * 36)}>
                    <BarChart layout="vertical" data={data.stockByWarehouse} margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="warehouseName" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="quantity" name="Остаток" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Нет остатков на складах</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Return reasons */}
          {data.returns.reasons.length > 0 && (
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Причины возвратов</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {data.returns.reasons.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2">{r.reason}</td>
                        <td className="px-4 py-2 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap">{r.count}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
