import { redirect } from 'next/navigation';

// Стартовая страница админки — "Детали".
// Редирект нужен и для старых установленных PWA, у которых в манифесте
// закеширован start_url = /dashboard. Задачи переехали на /dashboard/tasks.
export default function DashboardIndexPage() {
  redirect('/dashboard/autoparts');
}
