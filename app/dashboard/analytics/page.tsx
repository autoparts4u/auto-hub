import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db/db";
import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/shop");

  // Раньше: N+1 (отдельный COUNT событий на каждого юзера).
  // Теперь: один проход по сессиям с _count событий + суммируем в JS.
  const [users, sessionEventCounts] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { activitySessions: true } },
        activitySessions: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            _count: { select: { events: true } },
          },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.userActivitySession.findMany({
      select: { userId: true, _count: { select: { events: true } } },
    }),
  ]);

  const totalEventsByUser = new Map<string, number>();
  for (const s of sessionEventCounts) {
    totalEventsByUser.set(s.userId, (totalEventsByUser.get(s.userId) ?? 0) + s._count.events);
  }
  const usersWithTotalEvents = users.map((user) => ({
    ...user,
    totalEvents: totalEventsByUser.get(user.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Аналитика</h1>
      </div>
      <AnalyticsTabs users={usersWithTotalEvents} />
    </div>
  );
}
