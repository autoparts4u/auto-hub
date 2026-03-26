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
import { Users, MonitorIcon, Search, ShoppingCart } from 'lucide-react';

interface ReportData {
  period: { days: number; from: string; to: string };
  summary: {
    totalSessions: number;
    activeUsers: number;
    totalEvents: number;
    avgDurationMin: number;
  };
  eventBreakdown: {
    pageViews: number;
    searches: number;
    filters: number;
    cartAdds: number;
    cartRemoves: number;
    cartCheckouts: number;
    modalOpens: number;
  };
  trend: { date: string; sessions: number; events: number; users: number }[];
  topSearches: { query: string; count: number }[];
  topPages: { path: string; count: number }[];
  topCartItems: { article: string; description: string; count: number }[];
  modalBreakdown: { modal: string; count: number }[];
  filterTypeUsage: { type: string; label: string; count: number }[];
  topFilterValues: { type: string; label: string; values: { value: string; count: number }[] }[];
  topUsers: { email: string; sessions: number; events: number; cartAdds: number; checkouts: number }[];
}

const PERIOD_OPTIONS = [
  { label: '7 дней', value: 7 },
  { label: '14 дней', value: 14 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Полгода', value: 180 },
  { label: 'Год', value: 365 },
];

const MODAL_LABELS: Record<string, string> = {
  cart: 'Корзина',
  my_orders: 'Мои заказы',
  my_reservations: 'Мои бронирования',
};

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="py-4"><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
        <Card className="py-4"><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function ActivityReport() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/activity?days=${d}`);
      if (!res.ok) throw new Error('Ошибка загрузки отчёта');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(days); }, [days, fetchReport]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <ReportSkeleton />
      ) : data && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MonitorIcon className="w-4 h-4" /> Сессий
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.totalSessions}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.summary.activeUsers} пользователей</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="w-4 h-4" /> Поисков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.eventBreakdown.searches}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.eventBreakdown.filters} фильтраций</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> В корзину
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.eventBreakdown.cartAdds}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.eventBreakdown.cartCheckouts} оформлений</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Ср. сессия
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.avgDurationMin} мин</p>
                <p className="text-xs text-muted-foreground mt-1">{data.summary.totalEvents} событий всего</p>
              </CardContent>
            </Card>
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность по дням</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.trend.length / 6))} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" name="Сессии" stroke="#6366f1" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="users" name="Пользователи" stroke="#22c55e" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Воронка корзины + Использование фильтров */}
          <div className={`grid gap-4 ${data.filterTypeUsage.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
            <Card>
              <CardHeader><CardTitle className="text-sm">Воронка корзины</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart layout="vertical" data={[
                    { name: 'Добавлено', value: data.eventBreakdown.cartAdds },
                    { name: 'Удалено', value: data.eventBreakdown.cartRemoves },
                    { name: 'Оформлено', value: data.eventBreakdown.cartCheckouts },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="value" name="Количество" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {data.filterTypeUsage.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-sm">Использование фильтров</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(160, data.filterTypeUsage.length * 32)}>
                    <BarChart layout="vertical" data={data.filterTypeUsage.map((f) => ({ name: f.label, value: f.count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="value" name="Применений" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : data.modalBreakdown.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-sm">Открытые разделы</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart layout="vertical" data={data.modalBreakdown.map((m) => ({ name: MODAL_LABELS[m.modal] ?? m.modal, value: m.count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip />
                      <Bar dataKey="value" name="Открытий" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Топ значений фильтров + Открытые разделы — auto-fill сетка без пустых мест */}
          {(data.topFilterValues.length > 0 || data.modalBreakdown.length > 0) && (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {data.topFilterValues.map((f) => (
                <Card key={f.type}>
                  <CardHeader><CardTitle className="text-sm">Топ: {f.label}</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        {f.values.map((v, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-1.5 truncate max-w-[160px] text-sm">{v.value}</td>
                            <td className="px-4 py-1.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap">{v.count}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
              {data.filterTypeUsage.length > 0 && data.modalBreakdown.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Открытые разделы</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        {data.modalBreakdown.map((m, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-1.5 text-sm">{MODAL_LABELS[m.modal] ?? m.modal}</td>
                            <td className="px-4 py-1.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap">{m.count}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Поиски + корзина — только если есть данные */}
          {(data.topSearches.length > 0 || data.topCartItems.length > 0) && (
            <div className={`grid gap-4 ${data.topSearches.length > 0 && data.topCartItems.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {data.topCartItems.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Топ деталей в корзине</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2">Артикул</th>
                          <th className="text-left px-4 py-2">Описание</th>
                          <th className="text-right px-4 py-2">Раз</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topCartItems.map((item, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 font-mono text-xs font-semibold">{item.article}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[140px]">{item.description}</td>
                            <td className="px-4 py-2 text-right font-semibold">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
              {data.topSearches.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Топ поисковых запросов</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2">Запрос</th>
                          <th className="text-right px-4 py-2">Раз</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topSearches.map((s, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 truncate max-w-[200px]">{s.query}</td>
                            <td className="px-4 py-2 text-right font-semibold">{s.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Top users */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Активные пользователи</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.topUsers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Нет данных</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left px-4 py-2">Пользователь</th>
                      <th className="text-right px-4 py-2">Сессий</th>
                      <th className="text-right px-4 py-2">В корзину</th>
                      <th className="text-right px-4 py-2">Оформлений</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((u, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 truncate max-w-[220px]">{u.email}</td>
                        <td className="px-4 py-2 text-right">{u.sessions}</td>
                        <td className="px-4 py-2 text-right">{u.cartAdds}</td>
                        <td className="px-4 py-2 text-right font-semibold">{u.checkouts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
