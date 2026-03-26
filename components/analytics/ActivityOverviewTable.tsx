"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  totalEvents: number;
  _count: { activitySessions: number };
  activitySessions: {
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    _count: { events: number };
  }[];
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSessionDuration(startedAt: Date | string, endedAt: Date | string | null): string {
  if (!endedAt) return "—";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1 мин";
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.floor(minutes / 60)}ч ${minutes % 60}мин`;
}

export function ActivityOverviewTable({ users }: { users: UserRow[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="text-left px-4 py-3 font-medium">Роль</th>
            <th className="text-left px-4 py-3 font-medium">Последняя сессия</th>
            <th className="text-left px-4 py-3 font-medium">Длительность</th>
            <th className="text-left px-4 py-3 font-medium">Сессий всего</th>
            <th className="text-left px-4 py-3 font-medium">Событий всего</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => {
            const lastSession = user.activitySessions[0];
            return (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Админ" : "Пользователь"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lastSession ? formatDate(lastSession.startedAt) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lastSession
                    ? getSessionDuration(lastSession.startedAt, lastSession.endedAt)
                    : "—"}
                </td>
                <td className="px-4 py-3">{user._count.activitySessions}</td>
                <td className="px-4 py-3">{user.totalEvents}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/analytics/${user.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      Детали <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Нет данных
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
