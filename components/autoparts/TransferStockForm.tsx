"use client";

import { useState } from "react";
import { transferStock } from "@/lib/actions/transferStock";
import { useRouter } from "next/navigation";
import { WarehouseStock } from "@/app/types/autoparts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TransferStockForm({
  partId,
  warehouses,
}: {
  partId: string;
  warehouses: WarehouseStock[];
}) {
  const router = useRouter();
  const [fromId, setFromId] = useState(warehouses[0]?.warehouseId || 0);
  const [toId, setToId] = useState(warehouses[1]?.warehouseId || 0);
  const [quantity, setQuantity] = useState(1);

  const handleTransfer = async () => {
    await transferStock(partId, fromId, toId, quantity);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          onChange={(e) => setFromId(Number(e.target.value))}
          value={fromId}
        >
          {warehouses.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.warehouseName}
            </option>
          ))}
        </select>
        →
        <select onChange={(e) => setToId(Number(e.target.value))} value={toId}>
          {warehouses.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.warehouseName}
            </option>
          ))}
        </select>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24"
        />
        <Button onClick={handleTransfer}>Переместить</Button>
      </div>
    </div>
  );
}
