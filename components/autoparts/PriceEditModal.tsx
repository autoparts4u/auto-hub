"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PriceEditModalProps {
  autopartId: string;
  onClose: () => void;
}

export function PriceEditModal({ autopartId, onClose }: PriceEditModalProps) {
  const [prices, setPrices] = useState<{ priceTypeId: number; priceTypeName: string; price: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/autoparts/${autopartId}/prices`);
        const data = await res.json();
        console.log(data)
        setPrices(data);
      } catch {
        toast.error("Ошибка загрузки цен");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [autopartId]);

  const handleChange = (id: number, value: string) => {
    setPrices((prev) =>
      prev.map((p) =>
        p.priceTypeId === id ? { ...p, price: value === "" ? null : parseFloat(value) } : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/autoparts/${autopartId}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices),
      });
      if (!res.ok) throw new Error();
      toast.success("Цены обновлены");
      router.refresh();
      onClose();
    } catch {
      toast.error("Ошибка при сохранении цен");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {prices.map(({ priceTypeId, priceTypeName, price }) => (
        <div className="grid gap-2" key={priceTypeId}>
          <Label>{priceTypeName}</Label>
          <Input
            type="number"
            step="0.01"
            value={price === null ? "" : price}
            onChange={(e) => handleChange(priceTypeId, e.target.value)}
          />
        </div>
      ))}

      <DialogFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохраняем...</> : "Сохранить"}
        </Button>
      </DialogFooter>
    </div>
  );
}
