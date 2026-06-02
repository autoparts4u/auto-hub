'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Coins,
  Package,
  Boxes,
  Snowflake,
  AlertCircle,
  ArrowDownWideNarrow,
} from 'lucide-react';

interface MarketData {
  period: { days: number; from: string; to: string };
  summary: {
    revenue: number;
    estProfit: number;
    marginPct: number;
    unitsSold: number;
    distinctArticles: number;
    ordersCount: number;
    avgOrderValue: number;
    inventoryValueCost: number;
    deadStockValue: number;
    deadStockCount: number;
    profitCoverage: number;
  };
  trend: { date: string; revenue: number; profit: number }[];
  topParts: {
    article: string;
    description: string;
    brand: string;
    qty: number;
    orders: number;
    revenue: number;
    profit: number | null;
    marginPct: number | null;
  }[];
  byBrand: { name: string; revenue: number; profit: number; qty: number }[];
  byCategory: { name: string; revenue: number; profit: number; qty: number }[];
  abc: {
    a: { count: number; revenue: number };
    b: { count: number; revenue: number };
    c: { count: number; revenue: number };
  };
  deadStock: { article: string; description: string; stock: number; valueCost: number }[];
  stockouts: { article: string; description: string; soldQty: number; stock: number }[];
  topReturned: { article: string; description: string; qty: number; count: number }[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
const num = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

const PERIOD_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '14 дней', value: 14 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Полгода', value: 180 },
  { label: 'Год', value: 365 },
];

type SortMetric = 'profit' | 'revenue' | 'qty' | 'orders';
const SORT_OPTIONS: { key: SortMetric; label: string }[] = [
  { key: 'profit', label: 'Прибыль' },
  { key: 'revenue', label: 'Выручка' },
  { key: 'qty', label: 'Количество' },
  { key: 'orders', label: 'Частота' },
];

const ABC_COLORS = { a: '#22c55e', b: '#f59e0b', c: '#94a3b8' };

export default function MarketOverview() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMetric, setSortMetric] = useState<SortMetric>('profit');

  const fetchData = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/market?days=${d}`);
      if (!res.ok) throw new Error('Ошибка загрузки обзора рынка');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  const sortedParts = useMemo(() => {
    if (!data) return [];
    const arr = [...data.topParts];
    arr.sort((a, b) => {
      if (sortMetric === 'profit') return (b.profit ?? -Infinity) - (a.profit ?? -Infinity);
      return (b[sortMetric] as number) - (a[sortMetric] as number);
    });
    return arr.slice(0, 15);
  }, [data, sortMetric]);

  const abcChart = useMemo(() => {
    if (!data) return [];
    const total = data.abc.a.revenue + data.abc.b.revenue + data.abc.c.revenue || 1;
    return (['a', 'b', 'c'] as const).map((k) => ({
      bucket: k.toUpperCase(),
      count: data.abc[k].count,
      revenue: data.abc[k].revenue,
      share: Math.round((data.abc[k].revenue / total) * 100),
      color: ABC_COLORS[k],
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Стратегический срез: прибыльность, спрос и состояние склада за период.
        </p>
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
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="py-4"><CardContent className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-7 w-24" /></CardContent></Card>
            ))}
          </div>
          <Card className="py-4"><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} title="Выручка" value={fmt(data.summary.revenue)} hint={`${num(data.summary.ordersCount)} зак. · ср. ${fmt(data.summary.avgOrderValue)}`} />
            <KpiCard icon={<Coins className="h-4 w-4" />} title="Прибыль" value={fmt(data.summary.estProfit)} hint={`маржа ${data.summary.marginPct.toFixed(1)}% · оценка`} accent="text-green-600" />
            <KpiCard icon={<Package className="h-4 w-4" />} title="Продано" value={`${num(data.summary.unitsSold)} шт.`} hint={`${num(data.summary.distinctArticles)} артикулов`} />
            <KpiCard icon={<Boxes className="h-4 w-4" />} title="Склад" value={fmt(data.summary.inventoryValueCost)} hint="по закупке" />
            <KpiCard icon={<Snowflake className="h-4 w-4" />} title="Неликвид" value={fmt(data.summary.deadStockValue)} hint={`${num(data.summary.deadStockCount)} позиций без продаж`} accent="text-orange-500" />
            <KpiCard icon={<ArrowDownWideNarrow className="h-4 w-4" />} title="Покрытие маржи" value={`${data.summary.profitCoverage.toFixed(0)}%`} hint="выручки с известной закупкой" />
          </div>

          {/* Trend */}
          <Card className="py-4">
            <CardHeader><CardTitle className="text-base">Выручка и прибыль</CardTitle></CardHeader>
            <CardContent>
              {data.trend.some((t) => t.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={data.trend} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.trend.length / 8) - 1)} />
                    <YAxis tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v) => fmt(typeof v === 'number' ? v : 0)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Выручка" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Нет продаж за период</div>
              )}
            </CardContent>
          </Card>

          {/* Top parts with metric toggle */}
          <Card className="py-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Топ деталей</CardTitle>
              <div className="flex items-center rounded-md border overflow-hidden">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setSortMetric(o.key)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      sortMetric === o.key ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {sortedParts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Артикул</th>
                        <th className="text-left py-2 pr-3 font-medium">Описание</th>
                        <th className="text-left py-2 pr-3 font-medium">Бренд</th>
                        <th className="text-right py-2 pr-3 font-medium">Кол-во</th>
                        <th className="text-right py-2 pr-3 font-medium">Зак.</th>
                        <th className="text-right py-2 pr-3 font-medium">Выручка</th>
                        <th className="text-right py-2 pr-3 font-medium">Прибыль</th>
                        <th className="text-right py-2 font-medium">Маржа</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedParts.map((p) => (
                        <tr key={p.article} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-3 font-mono text-xs">{p.article}</td>
                          <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate" title={p.description}>{p.description}</td>
                          <td className="py-2 pr-3 text-muted-foreground text-xs">{p.brand}</td>
                          <td className="py-2 pr-3 text-right">{num(p.qty)}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{p.orders}</td>
                          <td className="py-2 pr-3 text-right">{fmt(p.revenue)}</td>
                          <td className={`py-2 pr-3 text-right font-medium ${p.profit == null ? 'text-muted-foreground' : p.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {p.profit == null ? '—' : fmt(p.profit)}
                          </td>
                          <td className="py-2 text-right text-xs text-muted-foreground">
                            {p.marginPct == null ? '—' : `${p.marginPct.toFixed(0)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">«—» в прибыли = нет закупочной цены для расчёта.</p>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">Нет продаж за период</p>
              )}
            </CardContent>
          </Card>

          {/* Brand + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryBarCard title="По брендам" rows={data.byBrand} fill="#6366f1" />
            <CategoryBarCard title="По категориям" rows={data.byCategory} fill="#0ea5e9" />
          </div>

          {/* ABC */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="text-base">ABC-анализ ассортимента</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={abcChart} margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v) => fmt(typeof v === 'number' ? v : 0)} />
                    <Bar dataKey="revenue" name="Выручка" radius={[4, 4, 0, 0]}>
                      {abcChart.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">
                  {abcChart.map((e) => (
                    <div key={e.bucket} className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: e.color }} />
                      <span className="font-semibold w-6">{e.bucket}</span>
                      <span className="text-muted-foreground">{e.count} артик.</span>
                      <span className="ml-auto font-medium">{e.share}% выручки</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    A — ядро ассортимента (≈80% выручки): держать на складе и продвигать. C — кандидаты на сокращение.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dead stock + Stockouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Snowflake className="h-4 w-4 text-orange-500" /> Неликвид (есть, но не продаётся)</CardTitle></CardHeader>
              <CardContent>
                {data.deadStock.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Артикул</th>
                          <th className="text-left py-2 pr-3 font-medium">Описание</th>
                          <th className="text-right py-2 pr-3 font-medium">Остаток</th>
                          <th className="text-right py-2 font-medium">Заморожено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.deadStock.map((d) => (
                          <tr key={d.article} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2 pr-3 font-mono text-xs">{d.article}</td>
                            <td className="py-2 pr-3 text-muted-foreground max-w-[130px] truncate" title={d.description}>{d.description}</td>
                            <td className="py-2 pr-3 text-right">{num(d.stock)}</td>
                            <td className="py-2 text-right text-orange-500">{fmt(d.valueCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Весь товар на складе продаётся 👍</p>
                )}
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Дефицит при спросе</CardTitle></CardHeader>
              <CardContent>
                {data.stockouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Артикул</th>
                          <th className="text-left py-2 pr-3 font-medium">Описание</th>
                          <th className="text-right py-2 pr-3 font-medium">Продано</th>
                          <th className="text-right py-2 font-medium">Остаток</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.stockouts.map((s) => (
                          <tr key={s.article} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2 pr-3 font-mono text-xs">{s.article}</td>
                            <td className="py-2 pr-3 text-muted-foreground max-w-[130px] truncate" title={s.description}>{s.description}</td>
                            <td className="py-2 pr-3 text-right font-medium">{num(s.soldQty)}</td>
                            <td className="py-2 text-right text-destructive">{num(s.stock)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-muted-foreground">Продавалось за период, но на складе пусто — кандидаты на закупку.</p>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Дефицита нет 👍</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top returned */}
          {data.topReturned.length > 0 && (
            <Card className="py-4">
              <CardHeader><CardTitle className="text-base">Чаще всего возвращают</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Артикул</th>
                        <th className="text-left py-2 pr-3 font-medium">Описание</th>
                        <th className="text-right py-2 pr-3 font-medium">Шт.</th>
                        <th className="text-right py-2 font-medium">Возвратов</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topReturned.map((r) => (
                        <tr key={r.article} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-3 font-mono text-xs">{r.article}</td>
                          <td className="py-2 pr-3 text-muted-foreground max-w-[200px] truncate" title={r.description}>{r.description}</td>
                          <td className="py-2 pr-3 text-right font-medium text-orange-500">{num(r.qty)}</td>
                          <td className="py-2 text-right text-muted-foreground">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="py-4">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold ${accent ?? ''}`}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function CategoryBarCard({
  title,
  rows,
  fill,
}: {
  title: string;
  rows: { name: string; revenue: number; profit: number; qty: number }[];
  fill: string;
}) {
  return (
    <Card className="py-4">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 34)}>
            <BarChart layout="vertical" data={rows} margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                formatter={(v) =>
                  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
                    typeof v === 'number' ? v : 0
                  )
                }
              />
              <Bar dataKey="revenue" name="Выручка" fill={fill} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Нет данных</p>
        )}
      </CardContent>
    </Card>
  );
}
