"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutopartWithStock } from "@/app/types/autoparts";
import { Brands, Categories, Warehouses } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";

interface AutopartModalProps {
  part?: AutopartWithStock | null;
  isNew?: boolean;
  onClose: () => void;
}

export function AutopartModal({ part, isNew, onClose }: AutopartModalProps) {
  const router = useRouter();
  const [article, setArticle] = useState(part?.article ?? "");
  const [description, setDescription] = useState(part?.description ?? "");
  const [brandId, setBrandId] = useState<string>(
    part?.brand.id.toString() ?? ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    part?.category.id.toString() ?? ""
  );
  const [brands, setBrands] = useState<Brands[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [stockByWarehouse, setStockByWarehouse] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [analogueSearch, setAnalogueSearch] = useState("");
  const [analogueResults, setAnalogueResults] = useState<AutopartWithStock[]>(
    []
  );
  const [analogues, setAnalogues] = useState<AutopartWithStock[]>([]);
  const [isAnalogueDropdownOpen, setIsAnalogueDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [touched, setTouched] = useState({
    article: false,
    description: false,
    brandId: false,
    categoryId: false,
  });

  const articleRef = useRef<HTMLInputElement>(null);

  // Загрузка данных при открытии модалки
  useEffect(() => {
    const load = async () => {
      const [brandsRes, categoriesRes, warehousesRes] = await Promise.all([
        fetch("/api/brands"),
        fetch("/api/categories"),
        fetch("/api/warehouses"),
      ]);
      const [brandsData, categoriesData, warehousesData] = await Promise.all([
        brandsRes.json(),
        categoriesRes.json(),
        warehousesRes.json(),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
      setWarehouses(warehousesData);

      if (part) {
        const initialStock: Record<string, number> = {};
        part.warehouses.forEach((w) => {
          initialStock[w.warehouseId] = w.quantity;
        });
        warehousesData.forEach((w: Warehouses) => {
          if (!initialStock[w.id]) initialStock[w.id] = 0;
        });
        setStockByWarehouse(initialStock);

        // Загрузка аналогов для существующей запчасти
        const analoguesRes = await fetch(`/api/autoparts/${part.id}/analogues`);
        if (analoguesRes.ok) {
          const analoguesData = await analoguesRes.json();
          setAnalogues(analoguesData);
        }
      } else {
        setStockByWarehouse(
          Object.fromEntries(warehousesData.map((w: Warehouses) => [w.id, 0]))
        );
      }

      setLoading(false);
    };
    load();
    articleRef.current?.focus();
  }, [part]);

  // Поиск аналогов по артикулу/описанию
  useEffect(() => {
    if (!analogueSearch.trim()) {
      setAnalogueResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      const res = await fetch(`/api/autoparts/search?q=${analogueSearch}`);
      setIsSearching(false);
      if (res.ok) {
        const data = await res.json();
        setAnalogueResults(data);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [analogueSearch]);

  const handleAddAnalogue = (analogue: AutopartWithStock) => {
    setAnalogues((prev) => [...prev, analogue]); // не проверяем дубликаты
    setAnalogueResults((prev) => prev.filter((p) => p.id !== analogue.id));
  };

  const handleSubmit = async () => {
    setTouched({
      article: true,
      description: true,
      brandId: true,
      categoryId: true,
    });

    if (!article || !description || !brandId || !categoryId) {
      toast.error("Пожалуйста, заполните все поля");
      return;
    }

    setSubmitting(true);

    const stock = Object.entries(stockByWarehouse)
      .filter(([, qty]) => qty > 0)
      .map(([warehouseId, quantity]) => ({
        warehouseId: Number(warehouseId),
        quantity,
      }));

    const analogueIds = analogues.map((a) => a.id);

    const res = await fetch(
      isNew ? "/api/autoparts" : `/api/autoparts/${part?.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article,
          description,
          brandId: Number(brandId),
          categoryId: Number(categoryId),
          stock,
          analogueIds, // добавляем аналоги
        }),
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      toast.error("Ошибка сохранения запчасти");
      return;
    }

    toast.success(part ? "Запчасть обновлена" : "Запчасть добавлена");
    onClose();
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="w-1/6 text-sm font-medium text-right">
            Артикул
          </label>
          <Input
            ref={articleRef}
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, article: true }))}
            className={clsx({ "border-red-500": touched.article && !article })}
          />
        </div>
        {touched.article && !article && (
          <p className="text-sm text-red-500 ml-[16.66%]">Поле обязательно</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="w-1/6 text-sm font-medium text-right">
            Описание
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, description: true }))
            }
            className={clsx({
              "border-red-500": touched.description && !description,
            })}
          />
        </div>
        {touched.description && !description && (
          <p className="text-sm text-red-500 ml-[16.66%]">Поле обязательно</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="w-1/6 text-sm font-medium text-right">Бренд</label>
          {loading ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <Select
              value={brandId}
              onValueChange={(value) => {
                setBrandId(value);
                setTouched((prev) => ({ ...prev, brandId: true }));
              }}
            >
              <SelectTrigger
                className={clsx("w-full", {
                  "border-red-500": touched.brandId && !brandId,
                })}
              >
                <SelectValue placeholder="Выберите бренд" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {touched.brandId && !brandId && (
          <p className="text-sm text-red-500 ml-[16.66%]">Поле обязательно</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label className="w-1/6 text-sm font-medium text-right">
            Категория
          </label>
          {loading ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                setTouched((prev) => ({ ...prev, categoryId: true }));
              }}
            >
              <SelectTrigger
                className={clsx("w-full", {
                  "border-red-500": touched.categoryId && !categoryId,
                })}
              >
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {touched.categoryId && !categoryId && (
          <p className="text-sm text-red-500 ml-[16.66%]">Поле обязательно</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 mt-4">
          <h4 className="text-sm font-medium">Наличие на складах</h4>
          {warehouses.map((wh) => (
            <div key={wh.id} className="flex items-center gap-2">
              <label className="w-1/6 text-sm text-right">{wh.name}</label>
              <Input
  type="number"
  min={0}
  value={stockByWarehouse[wh.id] === undefined ? "" : stockByWarehouse[wh.id] === 0 ? "" : stockByWarehouse[wh.id]}
  onChange={(e) => {
    const value = e.target.value;
    setStockByWarehouse((prev) => ({
      ...prev,
      [wh.id]: value === "" ? "" : Number(value),
    }));
  }}
/>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-2">Аналоги</h4>

        {loading ? (
          <div className="space-y-2 mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : analogues.length > 0 ? (
          <ul className="space-y-1 mb-3">
            {analogues.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center border p-2 rounded"
              >
                <span>
                  {a.article} - {a.description}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setAnalogues((prev) => prev.filter((p) => p.id !== a.id))
                  }
                >
                  Удалить
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">
            Аналогов пока нет
          </p>
        )}

        <Input
          placeholder="Поиск аналога"
          value={analogueSearch}
          onChange={(e) => setAnalogueSearch(e.target.value)}
          onFocus={() => setIsAnalogueDropdownOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsAnalogueDropdownOpen(false), 200);
          }}
        />

        {isAnalogueDropdownOpen && (
          <div className="border rounded mt-2 max-h-40 overflow-auto bg-white shadow">
            {isSearching ? (
              <div className="p-2 text-sm text-muted-foreground">Поиск...</div>
            ) : analogueResults.length > 0 ? (
              analogueResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 hover:bg-accent cursor-pointer"
                  onMouseDown={() => handleAddAnalogue(result)}
                >
                  {result.article} - {result.description}
                </div>
              ))
            ) : analogueSearch.trim() ? (
              <div className="p-2 text-sm text-muted-foreground">
                Аналоги не найдены
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Сохранение..." : isNew ? "Добавить" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
