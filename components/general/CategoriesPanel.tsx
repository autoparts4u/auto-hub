"use client";

import { useMemo, useState } from "react";
import { Categories } from "@prisma/client";
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

interface CategoriesPanelProps {
  categories: Categories[];
}

export function CategoriesPanel({ categories }: CategoriesPanelProps) {
  const [localCategories, setLocalCategories] = useState(categories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalCategories((prev) => [...prev, created]);
      setNewName("");
      toast.success("Категория добавлена");
    } else {
      toast.error("Ошибка при добавлении категории");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Категория удалена");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (category: Categories) => {
    setEditingId(category.id);
    setEditingValue(category.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingValue }),
    });

    if (res.ok) {
      setLocalCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editingValue } : c))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Категория обновлена");
    } else {
      toast.error("Ошибка при обновлении категории");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = localCategories.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localCategories, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название категории"
        />
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> Добавить
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
        {filteredAndSorted.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === c.id ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="mr-2"
              />
            ) : (
              <span>{c.name}</span>
            )}

            <div className="flex gap-1">
              {editingId === c.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(c.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(c)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(c.id)}
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