"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, Filter, Eye, MonitorIcon, MapPin } from "lucide-react";
import Link from "next/link";

interface ActivityEvent {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: Date | string;
}

interface ActivitySession {
  id: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  userAgent: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  events: ActivityEvent[];
  _count: { events: number };
}

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: Date | string;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getDuration(startedAt: Date | string, endedAt: Date | string | null): string {
  if (!endedAt) return "активна";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "< 1 сек";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин ${seconds % 60} сек`;
  return `${Math.floor(minutes / 60)}ч ${minutes % 60}мин`;
}

function getEventIcon(type: string) {
  if (type === "search") return <Search className="w-3.5 h-3.5 text-blue-500" />;
  if (type === "filter") return <Filter className="w-3.5 h-3.5 text-orange-500" />;
  return <Eye className="w-3.5 h-3.5 text-gray-400" />;
}

function formatEventPayload(event: ActivityEvent): string {
  const p = event.payload;
  if (!p) return "";
  if (event.type === "search") return `"${p.query}"`;
  if (event.type === "filter") {
    const values = Array.isArray(p.values) ? (p.values as string[]).join(", ") : String(p.value ?? "");
    return `${p.type}: ${values || "—"}`;
  }
  if (event.type === "page_view") return String(p.path ?? "");
  return JSON.stringify(p);
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Неизвестно";
  if (ua.includes("Mobile")) return "Мобильный";
  return "Десктоп";
}

function SessionRow({ session }: { session: ActivitySession }) {
  const [expanded, setExpanded] = useState(false);

  const searches = session.events.filter((e) => e.type === "search");
  const filters = session.events.filter((e) => e.type === "filter");
  const pageViews = session.events.filter((e) => e.type === "page_view");

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Session header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Начало</p>
            <p className="font-medium">{formatDate(session.startedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Длительность</p>
            <p className="font-medium">{getDuration(session.startedAt, session.endedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Устройство</p>
            <p className="font-medium flex items-center gap-1">
              <MonitorIcon className="w-3.5 h-3.5" />
              {parseUserAgent(session.userAgent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Локация</p>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              {session.city && session.country
                ? `${session.city}, ${session.country}`
                : session.country ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IP</p>
            <p className="font-medium font-mono text-xs">{session.ipAddress ?? "—"}</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs gap-1">
            <Eye className="w-3 h-3" />{pageViews.length}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1 text-blue-600">
            <Search className="w-3 h-3" />{searches.length}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1 text-orange-600">
            <Filter className="w-3 h-3" />{filters.length}
          </Badge>
        </div>
      </div>

      {/* Events list */}
      {expanded && (
        <div className="divide-y">
          {session.events.length === 0 && (
            <p className="px-6 py-4 text-sm text-muted-foreground">Нет событий</p>
          )}
          {session.events.map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-6 py-2 hover:bg-muted/20">
              <span className="shrink-0">{getEventIcon(event.type)}</span>
              <span className="text-xs text-muted-foreground font-mono shrink-0 w-20">
                {formatTime(event.createdAt)}
              </span>
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {event.type === "page_view" ? "Страница" : event.type === "search" ? "Поиск" : "Фильтр"}
              </span>
              <span className="text-sm truncate">{formatEventPayload(event)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserActivityDetail({
  user,
  sessions,
}: {
  user: User;
  sessions: ActivitySession[];
}) {
  const totalSearches = sessions.flatMap((s) => s.events).filter((e) => e.type === "search").length;
  const topSearches = sessions
    .flatMap((s) => s.events)
    .filter((e) => e.type === "search" && e.payload?.query)
    .map((e) => String(e.payload!.query))
    .reduce<Record<string, number>>((acc, q) => ({ ...acc, [q]: (acc[q] ?? 0) + 1 }), {});

  const topSearchList = Object.entries(topSearches)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Всего сессий</p>
          <p className="text-2xl font-bold">{sessions.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Всего поисков</p>
          <p className="text-2xl font-bold">{totalSearches}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Зарегистрирован</p>
          <p className="text-sm font-medium mt-1">{formatDate(user.createdAt)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Роль</p>
          <Badge className="mt-1" variant={user.role === "admin" ? "default" : "secondary"}>
            {user.role === "admin" ? "Админ" : "Пользователь"}
          </Badge>
        </div>
      </div>

      {/* Top searches */}
      {topSearchList.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold">Топ поисковых запросов</p>
          <div className="flex flex-wrap gap-2">
            {topSearchList.map(([query, count]) => (
              <Badge key={query} variant="outline" className="gap-1">
                {query}
                <span className="text-muted-foreground">×{count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/dashboard/analytics">
        <Button variant="outline" size="sm">← Все пользователи</Button>
      </Link>

      {/* Sessions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Сессии</p>
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">Нет данных</p>
        )}
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}
