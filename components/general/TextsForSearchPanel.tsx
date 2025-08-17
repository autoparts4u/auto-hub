"use client";

import { useMemo, useState } from "react";
import { TextForAuthopartsSearch } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash, Plus, Pencil, Save, ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";

interface TextsForSearchPanelProps {
  textsForSearch: TextForAuthopartsSearch[];
}

export function TextsForSearchPanel({ textsForSearch }: TextsForSearchPanelProps) {
  const [localTextsForSearch, setLocalTextsForSearch] = useState(textsForSearch);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleCreate = async () => {
    if (!newText.trim()) return;

    const res = await fetch("/api/texts-for-search", {
      method: "POST",
      body: JSON.stringify({ text: newText }),
    });

    if (res.ok) {
      const created = await res.json();
      setLocalTextsForSearch((prev) => [...prev, created]);
      setNewText("");
      toast.success("Текст добавлен");
    } else {
      toast.error("Ошибка при добавлении текста");
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/texts-for-search/${id}`, { method: "DELETE" });

    if (res.ok) {
      setLocalTextsForSearch((prev) => prev.filter((b) => b.id !== id));
      toast.success("Текст удалён");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const handleEdit = (textForSearch: TextForAuthopartsSearch) => {
    setEditingId(textForSearch.id);
    setEditingValue(textForSearch.text);
  };

  const handleSave = async (id: number) => {
    if (!editingValue.trim()) return;

    const res = await fetch(`/api/texts-for-search/${id}`, {
      method: "PUT",
      body: JSON.stringify({ text: editingValue }),
    });

    if (res.ok) {
      setLocalTextsForSearch((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: editingValue } : b))
      );
      setEditingId(null);
      setEditingValue("");
      toast.success("Текст обновлён");
    } else {
      toast.error("Ошибка при обновлении текста");
    }
  };

  const filteredAndSortedTextsForSearch = useMemo(() => {
    const filtered = localTextsForSearch.filter((b) =>
      b.text.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      sortAsc
        ? a.text.localeCompare(b.text)
        : b.text.localeCompare(a.text)
    );
  }, [localTextsForSearch, search, sortAsc]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Название текста"
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
        {filteredAndSortedTextsForSearch.map((b) => (
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
              <span>{b.text}</span>
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