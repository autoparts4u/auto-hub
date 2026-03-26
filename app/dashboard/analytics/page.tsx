import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db/db";
import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/shop");

  const users = await db.user.findMany({
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
  });

  // Считаем суммарное количество событий для каждого пользователя
  const usersWithTotalEvents = await Promise.all(
    users.map(async (user) => {
      const totalEvents = await db.userActivityEvent.count({
        where: { session: { userId: user.id } },
      });
      return { ...user, totalEvents };
    })
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Аналитика</h1>
      </div>
      <AnalyticsTabs users={usersWithTotalEvents} />
    </div>
  );
}
