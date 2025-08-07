"use client";

import { useState } from "react";
import { Warehouses } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, Plus, Pencil, Save } from "lucide-react";

interface WarehousesPanelProps {
  warehouses: Warehouses[];
}

export function WarehousesPanel({ warehouses }: WarehousesPanelProps) {
  const [localWarehouses, setLocalWarehouses] = useState(warehouses);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !newAddress.trim()) {
      toast.error("Заполните все поля");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, address: newAddress }),
      });

      if (!res.ok) throw new Error();

      const created = await res.json();
      setLocalWarehouses((prev) => [...prev, created]);
      setNewName("");
      setNewAddress("");
      toast.success("Склад добавлен");
    } catch {
      toast.error("Ошибка при добавлении склада");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setLocalWarehouses((prev) => prev.filter((w) => w.id !== id));
      toast.success("Склад удален");
    } catch {
      toast.error("Ошибка при удалении склада");
    }
  };

  const handleEdit = (w: Warehouses) => {
    setEditingId(w.id);
    setEditingName(w.name);
    setEditingAddress(w.address);
  };

  const handleSave = async (id: number) => {
    if (!editingName.trim() || !editingAddress.trim()) return;

    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName,
          address: editingAddress,
        }),
      });

      if (!res.ok) throw new Error();

      setLocalWarehouses((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, name: editingName, address: editingAddress } : w
        )
      );
      toast.success("Склад обновлён");
      setEditingId(null);
      setEditingName("");
      setEditingAddress("");
    } catch {
      toast.error("Ошибка при обновлении");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название склада"
        />
        <Input
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          placeholder="Адрес"
        />
      <Button onClick={handleCreate} disabled={loading}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>
      </div>

      <ul className="space-y-2 mt-6">
        {localWarehouses.map((w) => (
          <li
            key={w.id}
            // className="flex justify-between items-center border px-4 py-2 rounded bg-muted"
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            <div className="flex-1 mr-2">
              {editingId === w.id ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Название"
                  />
                  <Input
                    value={editingAddress}
                    onChange={(e) => setEditingAddress(e.target.value)}
                    placeholder="Адрес"
                  />
                </div>
              ) : (
                <>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {w.address}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-1">
              {editingId === w.id ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSave(w.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(w)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(w.id)}
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
