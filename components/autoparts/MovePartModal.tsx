"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Warehouses } from "@prisma/client";
import { toast } from "sonner";
import { AutopartWithStock, WarehouseStock } from "@/app/types/autoparts";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "stock" | "move";

interface MovePartModalProps {
  part: AutopartWithStock;
  onClose: () => void;
  onStockUpdated?: (newWarehouses: WarehouseStock[]) => void;
  onMoved?: (fromWarehouseId: number, toWarehouseId: number, quantity: number) => void;
}

export function MovePartModal({ part, onClose, onStockUpdated, onMoved }: MovePartModalProps) {
  const [tab, setTab] = useState<Tab>("stock");
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [loading, setLoading] = useState(true);

  // Остатки
  const [stockValues, setStockValues] = useState<Record<number, string>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Перемещение
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/warehouses");
        const data: Warehouses[] = await res.json();
        setWarehouses(data);
        // Инициализируем поля остатков: для каждого склада текущее значение или 0
        const init: Record<number, string> = {};
        data.forEach(w => {
          const existing = part.warehouses.find(pw => pw.warehouseId === w.id);
          init[w.id] = existing ? String(existing.quantity) : "0";
        });
        setStockValues(init);
      } catch {
        toast.error("Ошибка загрузки складов");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [part]);

  const getWarehouseName = (id: number) =>
    warehouses.find(w => w.id === id)?.name ?? `Склад #${id}`;

  // --- Сохранение остатков ---
  const handleSaveStock = async () => {
    setIsSavingStock(true);
    try {
      const stock = Object.entries(stockValues)
        .map(([id, qty]) => ({ warehouseId: Number(id), quantity: Number(qty) || 0 }));

      const res = await fetch(`/api/autoparts/${part.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Ошибка сохранения");
        return;
      }

      const newWarehouses: WarehouseStock[] = stock
        .filter(s => s.quantity > 0)
        .map(s => ({
          warehouseId: s.warehouseId,
          warehouseName: getWarehouseName(s.warehouseId),
          quantity: s.quantity,
        }));

      toast.success("Остатки обновлены");
      onStockUpdated?.(newWarehouses);
      onClose();
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setIsSavingStock(false);
    }
  };

  // --- Перемещение ---
  const handleMove = async () => {
    const qty = Number(moveQty);
    if (!fromWarehouseId || !toWarehouseId || qty <= 0) {
      toast.error("Заполните все поля правильно");
      return;
    }
    const fromStock = part.warehouses.find(w => w.warehouseId.toString() === fromWarehouseId);
    if (!fromStock || fromStock.quantity < qty) {
      toast.error("Недостаточно деталей на складе-источнике");
      return;
    }
    setIsMoving(true);
    try {
      const res = await fetch("/api/autoparts/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autopartId: part.id,
          fromWarehouseId: Number(fromWarehouseId),
          toWarehouseId: Number(toWarehouseId),
          quantity: qty,
        }),
      });
      if (!res.ok) {
        toast.error("Ошибка при перемещении");
        return;
      }
      toast.success("Успешно перемещено");
      onMoved?.(Number(fromWarehouseId), Number(toWarehouseId), qty);
      onClose();
    } catch {
      toast.error("Что-то пошло не так");
    } finally {
      setIsMoving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 py-4">
        {[1, 2, 3].map(i => (
          <div className="grid gap-2" key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const availableFromWarehouses = part.warehouses
    .filter(w => w.quantity > 0)
    .map(w => ({ id: w.warehouseId, name: getWarehouseName(w.warehouseId), quantity: w.quantity }));

  return (
    <div className="space-y-4">
      {/* Табы */}
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
        {([["stock", "Остатки"], ["move", "Перемещение"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Вкладка: Остатки */}
      {tab === "stock" && (
        <>
          <div className="space-y-3">
            {warehouses.map(w => (
              <div key={w.id} className="flex items-center gap-3">
                <Label className="flex-1 text-sm">{w.name}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  className="w-24 text-right"
                  value={stockValues[w.id] ?? "0"}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "" || /^\d*$/.test(val))
                      setStockValues(prev => ({ ...prev, [w.id]: val }));
                  }}
                  onBlur={() =>
                    setStockValues(prev => ({
                      ...prev,
                      [w.id]: String(Math.max(0, Number(prev[w.id]) || 0)),
                    }))
                  }
                />
                <span className="text-xs text-muted-foreground w-6">шт.</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveStock} disabled={isSavingStock}>
              {isSavingStock ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохраняем...</> : "Сохранить"}
            </Button>
          </DialogFooter>
        </>
      )}

      {/* Вкладка: Перемещение */}
      {tab === "move" && (
        <>
          <div className="text-sm text-muted-foreground space-y-1">
            {part.warehouses.map(stock => (
              <div key={stock.warehouseId}>
                На складе <strong>{getWarehouseName(stock.warehouseId)}</strong> — {stock.quantity} шт.
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from">Со склада</Label>
              <select
                id="from"
                value={fromWarehouseId}
                onChange={e => setFromWarehouseId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Выберите склад</option>
                {availableFromWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} — {w.quantity} шт.</option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="to">На склад</Label>
              <select
                id="to"
                value={toWarehouseId}
                onChange={e => setToWarehouseId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Выберите склад</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qty">Количество</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={moveQty}
                placeholder="0"
                onChange={e => setMoveQty(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleMove} disabled={isMoving}>
              {isMoving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Перемещаем...</> : "Переместить"}
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  );
}
