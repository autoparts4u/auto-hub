"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Warehouses } from "@prisma/client";
import { toast } from "sonner";
import { AutopartWithStock } from "@/app/types/autoparts";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface MovePartModalProps {
  part: AutopartWithStock;
  onClose: () => void;
}

export function MovePartModal({ part, onClose }: MovePartModalProps) {
  const router = useRouter();

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/warehouses");
        const data = await res.json();
        setWarehouses(data);
      } catch {
        toast.error("Ошибка загрузки складов");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    return () => {
      setFromWarehouseId("");
      setToWarehouseId("");
      setQuantity("");
    };
  }, []);

  const handleMove = async () => {
    const numericQuantity = Number(quantity);

    if (!fromWarehouseId || !toWarehouseId || numericQuantity <= 0) {
      toast.error("Заполните все поля правильно");
      return;
    }

    const fromStock = part.warehouses.find(
      (w) => w.warehouseId.toString() === fromWarehouseId
    );
    if (!fromStock || fromStock.quantity < numericQuantity) {
      toast.error("Недостаточно запчастей на складе-источнике");
      return;
    }

    setIsMoving(true);

    try {
      console.log("---------------------");
      console.log("--:", toWarehouseId)
      const res = await fetch("/api/autoparts/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autopartId: part.id,
          fromWarehouseId: Number(fromWarehouseId),
          toWarehouseId: Number(toWarehouseId),
          quantity: numericQuantity,
        }),
      });

      if (!res.ok) {
        toast.error("Ошибка при перемещении");
        return;
      }

      toast.success("Успешно перемещено");
      router.refresh();
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
        {[1, 2, 3].map((i) => (
          <div className="grid gap-2" key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const getWarehouseName = (id: number) =>
    warehouses.find((w) => w.id === id)?.name || `Склад #${id}`;

  const availableFromWarehouses = part.warehouses
    .filter((w) => w.quantity > 0)
    .map((w) => ({
      id: w.warehouseId,
      name: getWarehouseName(w.warehouseId),
      quantity: w.quantity,
    }));

  return (
    <>
      {/* Список складов с количеством */}
      <div className="text-sm text-muted-foreground mb-4 space-y-1">
        {part.warehouses.map((stock) => {
          const name = getWarehouseName(stock.warehouseId);
          return (
            <div key={stock.warehouseId}>
              На складе <strong>{name}</strong> — {stock.quantity} шт.
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 py-4">
        {/* Со склада */}
        <div className="grid gap-2">
          <Label htmlFor="from">Со склада</Label>
          <select
            id="from"
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Выберите склад</option>
            {availableFromWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.quantity} шт.
              </option>
            ))}
          </select>
        </div>

        {/* На склад */}
        <div className="grid gap-2">
          <Label htmlFor="to">На склад</Label>
          {/* <select
            id="to"
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {part.warehouses.map((stock) => {
              const name = getWarehouseName(stock.warehouseId);
              return (
                <option key={stock.warehouseId}>
                  На складе <strong>{name}</strong> — {stock.quantity} шт.
                </option>
              );
            })}
          </select> */}
          <select
            id="to"
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Выберите склад</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Количество */}
        <div className="grid gap-2">
          <Label htmlFor="qty">Количество</Label>
          <Input
            id="qty"
            type="number"
            min={1}
            value={quantity}
            placeholder="0"
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleMove} disabled={isMoving}>
          {isMoving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Перемещаем...
            </>
          ) : (
            "Переместить"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
