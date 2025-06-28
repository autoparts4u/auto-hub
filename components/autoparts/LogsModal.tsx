"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type Log = {
  id: string;
  action: "created" | "updated" | "deleted" | "moved";
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  userName?: string | null;
};

export function LogsModal({ autopartId }: { autopartId: string }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [action, setAction] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/autoparts/${autopartId}/logs${action !== "all" ? `?action=${action}` : ""}`
        );
        if (!res.ok) throw new Error("Ошибка загрузки логов");
        const data = await res.json();
        setLogs(data);
        setError(null);
      } catch (err: unknown) {
        console.log(err);
        setError("Не удалось загрузить логи");
        setLogs([]);
      }
    };
    load();
  }, [autopartId, action]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Фильтр по действию" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все действия</SelectItem>
            <SelectItem value="created">Создание</SelectItem>
            <SelectItem value="updated">Изменение</SelectItem>
            <SelectItem value="deleted">Удаление</SelectItem>
            <SelectItem value="moved">Перемещение</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-destructive text-center">{error}</p>
      ) : !logs ? (
        <Skeleton className="w-full h-48" />
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">Нет изменений</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-border rounded-md p-3 text-sm bg-muted/30"
            >
              <p className="font-medium text-muted-foreground">
                {new Date(log.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>{log.field}</strong> был <span className="font-semibold">{log.action}</span>
              </p>
              <p className="text-muted-foreground">
                {log.oldValue ?? "—"} → {log.newValue ?? "—"}
              </p>
              {log.userName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Пользователь: <span className="font-medium">{log.userName}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}