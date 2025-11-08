"use client";

import { useMemo, useState } from "react";
import { Auto } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash,
  Plus,
  Pencil,
  Save,
  ArrowDownAZ,
  ArrowUpAZ,
  Search,
} from "lucide-react";

interface AutosPanelProps {
  autos: Auto[];
}

export function AutosPanel({ autos }: AutosPanelProps) {
  const [localAutos, setLocalAutos] = useState(autos);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/autos", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalAutos((prev) => [...prev, created]);
      setNewName("");
      toast.success("Авто добавлен");
    } else {
      toast.error("Ошибка при добавлении авто");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/autos/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalAutos((prev) => prev.filter((b) => b.id !== id));
      toast.success("Авто удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (auto: Auto) => {
    setEditingId(auto.id);
    setEditingValue(auto.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/autos/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingValue }),
    });

    if (res.ok) {
      setLocalAutos((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: editingValue } : b))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Авто обновлён");
    } else {
      toast.error("Ошибка при обновлении авто");
    }
  };

  const filteredAndSortedAutos = useMemo(() => {
    const filtered = localAutos.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localAutos, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setSearch(e.target.value); // поиск одновременно
            }}
            placeholder="Поиск или добавление"
            className="pl-8"
          />
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
        {filteredAndSortedAutos.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === b.id ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="mr-2"
              />
            ) : (
              <span>{b.name}</span>
            )}
            <div className="flex gap-1">
              {editingId === b.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(b.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(b)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  toast.warning(`Удалить "${b.name}"?`, {
                    action: {
                      label: "Да",
                      onClick: () => handleDelete(b.id),
                    },
                  })
                }
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
