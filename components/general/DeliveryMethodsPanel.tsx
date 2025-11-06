"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface DeliveryMethod {
  id: number;
  name: string;
}

interface DeliveryMethodsPanelProps {
  deliveryMethods: DeliveryMethod[];
}

export function DeliveryMethodsPanel({ deliveryMethods }: DeliveryMethodsPanelProps) {
  const [localMethods, setLocalMethods] = useState(deliveryMethods);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Введите название метода доставки");
      return;
    }

    const res = await fetch("/api/delivery-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalMethods((prev) => [...prev, created]);
      setNewName("");
      setSearch("");
      toast.success("Метод доставки добавлен");
    } else {
      const error = await res.json();
      toast.error(error.error || "Ошибка при добавлении метода доставки");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/delivery-methods/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalMethods((prev) => prev.filter((m) => m.id !== id));
      toast.success("Метод доставки удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (method: DeliveryMethod) => {
    setEditingId(method.id);
    setEditingName(method.name);
  };

  const handleSave = async (id: number) => {
    if (!editingName.trim()) {
      toast.error("Введите название метода доставки");
      return;
    }

    const res = await fetch(`/api/delivery-methods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });

    if (res.ok) {
      const updated = await res.json();
      setLocalMethods((prev) =>
        prev.map((m) => (m.id === id ? updated : m))
      );
      setEditingId(null);
      toast.success("Метод доставки обновлён");
    } else {
      const error = await res.json();
      toast.error(error.error || "Ошибка при обновлении метода доставки");
    }
  };

  const filteredAndSortedMethods = useMemo(() => {
    const filtered = localMethods.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localMethods, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setSearch(e.target.value);
            }}
            placeholder="Поиск или добавление метода доставки"
            className="pl-8"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> Добавить
        </Button>
        <Button
          onClick={() => setSortAsc((prev) => !prev)}
          variant="outline"
          className="shrink-0"
        >
          {sortAsc ? (
            <ArrowDownAZ className="w-4 h-4 mr-1" />
          ) : (
            <ArrowUpAZ className="w-4 h-4 mr-1" />
          )}
          Сортировка
        </Button>
      </div>

      <ul className="space-y-2">
        {filteredAndSortedMethods.map((method) => (
          <li
            key={method.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === method.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="mr-2"
              />
            ) : (
              <span>{method.name}</span>
            )}
            <div className="flex gap-1">
              {editingId === method.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(method.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(method)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      toast.warning(`Удалить "${method.name}"?`, {
                        action: {
                          label: "Да",
                          onClick: () => handleDelete(method.id),
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
