"use client";

import { useState } from "react";
import { PriceTypes } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, Pencil, Check } from "lucide-react";

interface PriceTypesPanelProps {
  initialPriceTypes: PriceTypes[];
}

export function PriceTypesPanel({ initialPriceTypes }: PriceTypesPanelProps) {
  const [types, setTypes] = useState(initialPriceTypes);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const handleEdit = async (id: number) => {
    if (!editingName.trim()) return;

    const res = await fetch(`/api/price-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingName }),
    });

    if (res.ok) {
      setTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: editingName } : t))
      );
      toast.success("Название обновлено");
      setEditingId(null);
      setEditingName("");
    } else {
      toast.error("Ошибка при обновлении");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Название типа цены"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={handleCreate}>
          <span className="mr-1">+</span> Добавить
        </Button>
      </div>

      <ul className="space-y-2">
        {types.map((type) => (
          <li
            key={type.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === type.id ? (
              <div className="flex w-full items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" onClick={() => handleEdit(type.id)}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <span>{type.name}</span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(type.id);
                      setEditingName(type.name);
                    }}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
