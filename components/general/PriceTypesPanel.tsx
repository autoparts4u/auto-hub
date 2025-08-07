"use client";

import { useMemo, useState } from "react";
import { PriceTypes } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash,
  Pencil,
  Save,
  ArrowDownAZ,
  ArrowUpAZ,
  Search,
} from "lucide-react";

interface PriceTypesPanelProps {
  initialPriceTypes: PriceTypes[];
}

export function PriceTypesPanel({ initialPriceTypes }: PriceTypesPanelProps) {
  const [types, setTypes] = useState(initialPriceTypes);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/price-types", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setTypes((prev) => [...prev, created]);
      setNewName("");
      toast.success("Тип цены добавлен");
    } else {
      toast.error("Ошибка при добавлении");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/price-types/${id}`, { method: "DELETE" });

    if (res.ok) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success("Тип цены удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (type: PriceTypes) => {
    setEditingId(type.id);
    setEditingValue(type.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/price-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingValue }),
    });

    if (res.ok) {
      setTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: editingValue } : t))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Тип цены обновлён");
    } else {
      toast.error("Ошибка при обновлении");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = types.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [types, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название типа цены"
        />
        <Button onClick={handleCreate}>
          <span className="mr-1">+</span> Добавить
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 mt-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию"
            className="pl-8"
          />
        </div>
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
        {filteredAndSorted.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === t.id ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="mr-2"
              />
            ) : (
              <span>{t.name}</span>
            )}

            <div className="flex gap-1">
              {editingId === t.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(t.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(t)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(t.id)}
              >
                <Trash className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}