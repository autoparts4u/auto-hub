import { getDashboardTasks } from '@/lib/services/dashboardTasks';
import { TasksWidget } from '@/components/dashboard/TasksWidget';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardTasks();

  const total =
    data.handoverToday.length +
    data.handoverOverdue.length +
    data.inAssembly.length +
    data.staleOrders.length +
    data.purchasesOverdue.length +
    data.reservationsExpiringSoon.length +
    data.returnsStale.length +
    data.unpaidIssued.length;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Задачи</h1>
          <p className="text-sm text-muted-foreground">
            Что требует внимания прямо сейчас · всего {total}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          обновлено {new Date(data.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <TasksWidget data={data} />
    </div>
  );
}
