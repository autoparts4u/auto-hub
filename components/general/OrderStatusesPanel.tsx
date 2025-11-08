"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Trash,
  Plus,
  Pencil,
  Save,
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
} from "lucide-react";

interface OrderStatus {
  id: number;
  name: string;
  hexColor: string;
  isLast: boolean;
}

interface OrderStatusesPanelProps {
  orderStatuses: OrderStatus[];
}

export function OrderStatusesPanel({ orderStatuses }: OrderStatusesPanelProps) {
  const [localStatuses, setLocalStatuses] = useState(orderStatuses);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newIsLast, setNewIsLast] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [editingIsLast, setEditingIsLast] = useState(false);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Введите название статуса");
      return;
    }

    const res = await fetch("/api/order-statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: newName,
        hexColor: newColor,
        isLast: newIsLast
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalStatuses((prev) => [...prev, created]);
      setNewName("");
      setSearch("");
      setNewColor("#3b82f6");
      setNewIsLast(false);
      toast.success("Статус добавлен");
    } else {
      const error = await res.json();
      toast.error(error.error || "Ошибка при добавлении статуса");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/order-statuses/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalStatuses((prev) => prev.filter((s) => s.id !== id));
      toast.success("Статус удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (status: OrderStatus) => {
    setEditingId(status.id);
    setEditingName(status.name);
    setEditingColor(status.hexColor);
    setEditingIsLast(status.isLast);
  };

  const handleSave = async (id: number) => {
    if (!editingName.trim()) {
      toast.error("Введите название статуса");
      return;
    }

    const res = await fetch(`/api/order-statuses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: editingName,
        hexColor: editingColor,
        isLast: editingIsLast
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setLocalStatuses((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      );
      setEditingId(null);
      toast.success("Статус обновлён");
    } else {
      const error = await res.json();
      toast.error(error.error || "Ошибка при обновлении статуса");
    }
  };

  const filteredAndSortedStatuses = useMemo(() => {
    const filtered = localStatuses.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localStatuses, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setSearch(e.target.value);
            }}
            placeholder="Поиск или добавление"
            className="pl-8"
          />
        </div>
        <Input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-16 md:w-20 h-10 cursor-pointer flex-shrink-0"
          title="Выберите цвет"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <Checkbox
            id="new-is-last"
            checked={newIsLast}
            onCheckedChange={(checked) => setNewIsLast(checked as boolean)}
          />
          <label htmlFor="new-is-last" className="text-sm cursor-pointer whitespace-nowrap">
            Финальный
          </label>
        </div>
        <Button onClick={handleCreate} className="flex-shrink-0">
          <Plus className="w-4 h-4 md:mr-1" />
          <span className="hidden md:inline">Добавить</span>
        </Button>
        <Button
          onClick={() => setSortAsc((prev) => !prev)}
          variant="outline"
          className="flex-shrink-0"
        >
          {sortAsc ? (
            <ArrowDownAZ className="w-4 h-4 md:mr-1" />
          ) : (
            <ArrowUpAZ className="w-4 h-4 md:mr-1" />
          )}
          <span className="hidden md:inline">Сортировка</span>
        </Button>
      </div>

      <ul className="space-y-2">
        {filteredAndSortedStatuses.map((status) => (
          <li
            key={status.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === status.id ? (
              <>
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <Input
                    type="color"
                    value={editingColor}
                    onChange={(e) => setEditingColor(e.target.value)}
                    className="w-16 h-8 cursor-pointer"
                  />
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-is-last-${status.id}`}
                      checked={editingIsLast}
                      onCheckedChange={(checked) => setEditingIsLast(checked as boolean)}
                    />
                    <label htmlFor={`edit-is-last-${status.id}`} className="text-sm cursor-pointer whitespace-nowrap">
                      Финальный
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: status.hexColor }}
                  />
                  <span>{status.name}</span>
                  {status.isLast && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Финальный
                    </span>
                  )}
                </div>
              </>
            )}
            <div className="flex gap-1">
              {editingId === status.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(status.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(status)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      toast.warning(`Удалить "${status.name}"?`, {
                        action: {
                          label: "Да",
                          onClick: () => handleDelete(status.id),
                        },
                      })
                    }
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
