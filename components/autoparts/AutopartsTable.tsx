"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AutopartWithStock } from "@/app/types/autoparts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { AutopartModal } from "./AutopartModal";
import { MovePartModal } from "./MovePartModal";
import { LogsModal } from "./LogsModal";
import {
  Plus,
  Pencil,
  Trash,
  ArrowRightLeft,
  // FileText,
  Tags,
  ArrowUpAZ,
  ArrowDownAZ,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PriceEditModal } from "./PriceEditModal";

interface Props {
  parts: AutopartWithStock[];
  brands: { id: number; name: string }[];
  warehouses: { id: number; name: string }[];
  onlyView?: boolean;
  priceAccessId?: number | null;
}

type SortKey =
  | "article"
  | "description"
  | "brand"
  | "category"
  | "totalQuantity";

export function AutopartsTable({
  parts,
  brands,
  warehouses,
  onlyView,
  priceAccessId,
}: Props) {
  const [selected, setSelected] = useState<AutopartWithStock | null>(null);
  const [movePart, setMovePart] = useState<AutopartWithStock | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logsPartId, setLogsPartId] = useState<string | null>(null);
  const [pricePartId, setPricePartId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [warehouse, setWarehouse] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("article");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const router = useRouter();

  const handleConfirmDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/autoparts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Ошибка удаления");
      }

      toast.success("Запчасть удалена");
      setDeletingId(null);
      router.refresh();
    } catch (error) {
      toast.error("Не удалось удалить запчасть");
      console.error(error);
    }
  };

  const filteredParts = parts
    .filter((p) => {
      const matchesSearch =
        p.article.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesBrand = brand === "all" || p.brand.name === brand;
      const matchesWarehouse =
        warehouse === "all" ||
        p.warehouses.some((w) => w.warehouseName === warehouse);
      return matchesSearch && matchesBrand && matchesWarehouse;
    })
    .sort((a, b) => {
      const getValue = (part: AutopartWithStock) => {
        switch (sortKey) {
          case "article":
            return part.article.toLowerCase();
          case "description":
            return part.description.toLowerCase();
          case "brand":
            return part.brand.name.toLowerCase();
          case "category":
            return part.category.name.toLowerCase();
          case "totalQuantity":
            return part.totalQuantity;
        }
      };
      const valA = getValue(a);
      const valB = getValue(b);

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const SortHeader = ({
    label,
    column,
  }: {
    label: string;
    column: SortKey;
  }) => (
    <button
      className="flex items-center justify-center w-full gap-1 font-semibold"
      onClick={() => toggleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortOrder === "asc" ? (
          <ArrowUpAZ className="w-4 h-4" />
        ) : (
          <ArrowDownAZ className="w-4 h-4" />
        )
      ) : null}
    </button>
  );

  return (
    <div className="w-full px-4">
      {!onlyView && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Автозапчасти
          </h2>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Добавить
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <Input
          placeholder="Поиск по описанию или артикулу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />

        <div className="space-y-1">
          <Label>Бренд</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все бренды" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!onlyView && (
          <div className="space-y-1">
            <Label>Склад</Label>
            <Select value={warehouse} onValueChange={setWarehouse}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все склады" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.name}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-center">
                <SortHeader label="Артикул" column="article" />
              </th>
              <th className="p-3 text-center">
                <SortHeader label="Бренд" column="brand" />
              </th>
              <th className="p-3 text-center">
                <SortHeader label="Описание" column="description" />
              </th>
              <th className="p-3 text-center">
                <SortHeader label="Категория" column="category" />
              </th>
              {!onlyView && (
                <th className="p-3 text-center">
                  <SortHeader label="Кол-во" column="totalQuantity" />
                </th>
              )}
              {!onlyView && <th className="p-3 text-center">Склады</th>}
              <th className="p-3 text-center">Цены</th>
              {!onlyView && <th className="p-3 text-center">Действия</th>}
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => (
              <tr
                key={p.id}
                className="border-t hover:bg-accent/40 transition-colors"
              >
                <td className="p-3 text-center font-mono font-medium">
                  {p.article}
                </td>
                <td className="p-3 text-center">{p.brand.name}</td>
                <td className="p-3">{p.description}</td>
                <td className="p-3 text-center">{p.category.name}</td>
                {!onlyView && (
                  <td className="p-3 text-center">{p.totalQuantity}</td>
                )}
                {!onlyView && (
                  <td className="p-3 text-center">
                    <ul className="space-y-1">
                      {p.warehouses.map((w) => (
                        <li key={w.warehouseId} className="text-xs">
                          {w.warehouseName}:{" "}
                          <span className="font-semibold">{w.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                )}
                <td className="p-3 text-center whitespace-nowrap">
                  {!priceAccessId ? (
                    <ul className="space-y-1 text-xs text-left">
                      {p.prices.map((price) => (
                        <li key={price.priceType.id}>
                          <span className="font-semibold">
                            {price.priceType.name}:
                          </span>{" "}
                          {price.price.toFixed(2)} $
                        </li>
                      ))}
                    </ul>
                  ) : (
                    `${
                      p.prices
                        .find((price) => price.priceType.id === priceAccessId)
                        ?.price.toFixed(2) ?? "-"
                    } $`
                  )}
                </td>
                {!onlyView && (
                  <td className="p-3 text-center flex items-center justify-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelected(p)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Редактировать</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMovePart(p)}
                          >
                            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Переместить</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPricePartId(p.id)}
                          >
                            <Tags className="w-4 h-4 text-green-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Редактировать цены</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLogsPartId(p.id)}
                          >
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>История изменений</p>
                        </TooltipContent>
                      </Tooltip> */}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(p.id)}
                          >
                            <Trash className="w-4 h-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Удалить</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={!!selected || creating}
        onOpenChange={() => {
          setSelected(null);
          setCreating(false);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>
            {creating ? "Добавить запчасть" : "Редактировать запчасть"}
          </DialogTitle>
          <AutopartModal
            part={selected}
            onClose={() => {
              setSelected(null);
              setCreating(false);
            }}
            isNew={creating}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!movePart} onOpenChange={() => setMovePart(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Переместить запчасть</DialogTitle>
          {movePart && (
            <MovePartModal part={movePart} onClose={() => setMovePart(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!logsPartId} onOpenChange={() => setLogsPartId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle>История изменений</DialogTitle>
          {logsPartId && <LogsModal autopartId={logsPartId} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle>Удалить запчасть?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Это действие необратимо. Вы уверены, что хотите удалить запчасть?
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleConfirmDelete(deletingId)}
            >
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pricePartId} onOpenChange={() => setPricePartId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle>Цены по типам</DialogTitle>
          {pricePartId && (
            <PriceEditModal
              autopartId={pricePartId}
              onClose={() => setPricePartId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
