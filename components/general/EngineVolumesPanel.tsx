"use client";

import { useMemo, useState } from "react";
import { EngineVolume } from "@prisma/client";
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

interface EngineVolumesPanelProps {
  engineVolumes: EngineVolume[];
}

export function EngineVolumesPanel({ engineVolumes }: EngineVolumesPanelProps) {
  const [localEngineVolumes, setLocalEngineVolumes] = useState(engineVolumes);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const res = await fetch("/api/engine-volumes", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalEngineVolumes((prev) => [...prev, created]);
      setNewName("");
      toast.success("Объем двигателя добавлен");
    } else {
      toast.error("Ошибка при добавлении объема двигателя");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/engine-volumes/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalEngineVolumes((prev) => prev.filter((ev) => ev.id !== id));
      toast.success("Объем двигателя удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (engineVolume: EngineVolume) => {
    setEditingId(engineVolume.id);
    setEditingValue(engineVolume.name);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/engine-volumes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: editingValue }),
    });

    if (res.ok) {
      setLocalEngineVolumes((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, name: editingValue } : ev))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Объем двигателя обновлён");
    } else {
      toast.error("Ошибка при обновлении объема двигателя");
    }
  };

  const filteredAndSortedEngineVolumes = useMemo(() => {
    const filtered = localEngineVolumes.filter((ev) =>
      ev.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [localEngineVolumes, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setSearch(e.target.value); // поиск одновременно
            }}
            placeholder="Поиск или добавление объема двигателя"
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
        {filteredAndSortedEngineVolumes.map((ev) => (
          <li
            key={ev.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            {editingId === ev.id ? (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="mr-2"
              />
            ) : (
              <span>{ev.name}</span>
            )}
            <div className="flex gap-1">
              {editingId === ev.id ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSave(ev.id)}
                >
                  <Save className="w-4 h-4 text-green-600" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(ev)}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  toast.warning(`Удалить "${ev.name}"?`, {
                    action: {
                      label: "Да",
                      onClick: () => handleDelete(ev.id),
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

