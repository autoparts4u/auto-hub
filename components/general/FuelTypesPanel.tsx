"use client";

import { useMemo, useState } from "react";
import { FuelType } from "@prisma/client";
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

interface FuelTypesPanelProps {
  fuelTypes: FuelType[];
}

export function FuelTypesPanel({ fuelTypes }: FuelTypesPanelProps) {
  const [localFuelTypes, setLocalFuelTypes] = useState(fuelTypes);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/fuel-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        const created = await res.json();
        setLocalFuelTypes((prev) => [...prev, created]);
        setNewName("");
        setSearch(""); // Очищаем поиск после добавления, чтобы показать весь список
        toast.success("Вид топлива добавлен");
      } else {
        const text = await res.text();
        let errorMessage = "Ошибка при добавлении вида топлива";
        try {
          const error = JSON.parse(text);
          errorMessage = error.error || errorMessage;
        } catch {
          // Если не удалось распарсить JSON, используем текст ответа или дефолтное сообщение
          errorMessage = text || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Ошибка при добавлении вида топлива:", error);
      toast.error("Ошибка при добавлении вида топлива");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/fuel-types/${id}`, { method: "DELETE" });

      if (res.ok) {
        setLocalFuelTypes((prev) => prev.filter((ft) => ft.id !== id));
        toast.success("Вид топлива удалён");
      } else {
        const text = await res.text();
        let errorMessage = "Ошибка при удалении";
        try {
          const error = JSON.parse(text);
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Ошибка при удалении вида топлива:", error);
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (fuelType: FuelType) => {
    setEditingId(fuelType.id);
    setEditingValue(fuelType.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    try {
      const res = await fetch(`/api/fuel-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingValue }),
      });

      if (res.ok) {
        setLocalFuelTypes((prev) =>
          prev.map((ft) => (ft.id === id ? { ...ft, name: editingValue } : ft))
        );
        setEditingId(null);
        setEditingValue("");
        toast.success("Вид топлива обновлён");
      } else {
        const text = await res.text();
        let errorMessage = "Ошибка при обновлении вида топлива";
        try {
          const error = JSON.parse(text);
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Ошибка при обновлении вида топлива:", error);
      toast.error("Ошибка при обновлении вида топлива");
    }
  };

  const filteredAndSortedFuelTypes = useMemo(() => {
    const filtered = localFuelTypes.filter((ft) =>
      ft.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localFuelTypes, search, sortAsc]);

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
            }}
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
        {filteredAndSortedFuelTypes.map((ft) => (
          <li
            key={ft.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === ft.id ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="mr-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSave(ft.id);
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                    setEditingValue("");
                  }
                }}
              />
            ) : (
              <span>{ft.name}</span>
            )}
            <div className="flex gap-1">
              {editingId === ft.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(ft.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(ft)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  toast.warning(`Удалить "${ft.name}"?`, {
                    action: {
                      label: "Да",
                      onClick: () => handleDelete(ft.id),
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


