"use client";

import { useState } from "react";
import { Brands } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, Plus, Pencil, Save } from "lucide-react";

interface BrandsPanelProps {
  brands: Brands[];
}

export function BrandsPanel({ brands }: BrandsPanelProps) {
  const [localBrands, setLocalBrands] = useState(brands);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/brands", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalBrands((prev) => [...prev, created]);
      setNewName("");
      toast.success("Бренд добавлен");
    } else {
      toast.error("Ошибка при добавлении бренда");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success("Бренд удален");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (brand: Brands) => {
    setEditingId(brand.id);
    setEditingValue(brand.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/brands/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingValue }),
    });

    if (res.ok) {
      setLocalBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: editingValue } : b))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Бренд обновлён");
    } else {
      toast.error("Ошибка при обновлении бренда");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название бренда"
        />
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" /> Добавить
        </Button>
      </div>

      <ul className="space-y-2">
        {localBrands.map((b) => (
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
                <Button size="icon" variant="ghost" onClick={() => handleSave(b.id)}>
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" onClick={() => handleEdit(b)}>
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(b.id)}
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