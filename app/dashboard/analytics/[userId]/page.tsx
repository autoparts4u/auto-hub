import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import db from "@/lib/db/db";
import { UserActivityDetail } from "@/components/analytics/UserActivityDetail";

export default async function UserAnalyticsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/shop");

  const { userId } = await params;

  const [user, sessions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    }),
    db.userActivitySession.findMany({
      where: { userId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        _count: { select: { events: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{user.email}</h1>
        <p className="text-muted-foreground text-sm">
          История активности · {sessions.length} сессий
        </p>
      </div>
      <UserActivityDetail user={user} sessions={sessions} />
    </div>
  );
}
