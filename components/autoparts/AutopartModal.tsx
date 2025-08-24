"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AutopartWithStock } from "@/app/types/autoparts";
import {
  Auto,
  Brands,
  Categories,
  TextForAuthopartsSearch,
  Warehouses,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const [maxNumberShown, setMaxNumberShown] = useState<string>(
    part?.maxNumberShown?.toString() ?? "5"
  );
  const [brandId, setBrandId] = useState<string>(
    part?.brand?.id.toString() ?? ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    part?.category?.id.toString() ?? ""
  );
  const [autoId, setAutoId] = useState<string>(part?.auto?.id.toString() ?? "");
  const [textForSearchId, setTextForSearchId] = useState<string>(
    part?.textForSearch?.id.toString() ?? ""
  );
  const [brands, setBrands] = useState<Brands[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  const [textsForSearch, setTextsForSearch] = useState<
    TextForAuthopartsSearch[]
  >([]);
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
    autoId: false,
    textForSearchId: false,
  });

  const articleRef = useRef<HTMLInputElement>(null);

  // Загрузка данных при открытии модалки
  useEffect(() => {
    const load = async () => {
      const [
        brandsRes,
        categoriesRes,
        warehousesRes,
        autosRes,
        textsForSearchRes,
      ] = await Promise.all([
        fetch("/api/brands"),
        fetch("/api/categories"),
        fetch("/api/warehouses"),
        fetch("/api/autos"),
        fetch("/api/texts-for-search"),
      ]);
      const [
        brandsData,
        categoriesData,
        warehousesData,
        autosData,
        textsForSearchData,
      ] = await Promise.all([
        brandsRes.json(),
        categoriesRes.json(),
        warehousesRes.json(),
        autosRes.json(),
        textsForSearchRes.json(),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
      setWarehouses(warehousesData);
      setAutos(autosData);
      setTextsForSearch(textsForSearchData);

      console.log("first");
      console.log(textsForSearch);

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
      autoId: true,
      textForSearchId: true,
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

    console.log("2");
    console.log(textForSearchId);

    const res = await fetch(
      isNew ? "/api/autoparts" : `/api/autoparts/${part?.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article,
          description,
          maxNumberShown: Number(maxNumberShown),
          brandId: Number(brandId),
          categoryId: Number(categoryId),
          autoId: Number(autoId),
          textForSearchId: textForSearchId && Number(textForSearchId),
          stock,
          analogueIds, // добавляем аналоги
        }),
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      toast.error("Ошибка сохранения детали");
      return;
    }

    toast.success(part ? "Деталь обновлена" : "Деталь добавлена");
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
          <label className="w-1/6 text-sm font-medium text-right">
            Максимум на складе
          </label>
          <Input
            type="number"
            min={1}
            value={maxNumberShown}
            onChange={(e) => setMaxNumberShown(e.target.value)}
          />
        </div>
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
      <div className="space-y-1">
        <label className="text-sm font-medium">Бренд</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={clsx(
                "w-full justify-between",
                touched.brandId && !brandId && "border-red-500"
              )}
            >
              {brandId
                ? brands.find((b) => b.id.toString() === brandId)?.name
                : "Выберите бренд"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Поиск бренда..." />
              <CommandList>
                <CommandEmpty>Бренд не найден</CommandEmpty>
                <CommandGroup>
                  {brands.map((b) => (
                    <CommandItem
                      key={b.id}
                      onSelect={() => {
                        setBrandId(b.id.toString());
                        setTouched((prev) => ({ ...prev, brandId: true }));
                      }}
                    >
                      {b.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {touched.brandId && !brandId && (
          <p className="text-sm text-red-500">Поле обязательно</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Категория</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={clsx(
                "w-full justify-between",
                touched.categoryId && !categoryId && "border-red-500"
              )}
            >
              {categoryId
                ? categories.find((c) => c.id.toString() === categoryId)?.name
                : "Выберите категорию"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Поиск категории..." />
              <CommandList>
                <CommandEmpty>Категория не найдена</CommandEmpty>
                <CommandGroup>
                  {categories.map((c) => (
                    <CommandItem
                      key={c.id}
                      onSelect={() => {
                        setCategoryId(c.id.toString());
                        setTouched((prev) => ({ ...prev, categoryId: true }));
                      }}
                    >
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {touched.categoryId && !categoryId && (
          <p className="text-sm text-red-500">Поле обязательно</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Авто</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={clsx(
                "w-full justify-between",
                touched.autoId && !autoId && "border-red-500"
              )}
            >
              {autoId
                ? autos.find((a) => a.id.toString() === autoId)?.name
                : "Выберите авто"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Поиск авто..." />
              <CommandList>
                <CommandEmpty>Авто не найдено</CommandEmpty>
                <CommandGroup>
                  {autos.map((a) => (
                    <CommandItem
                      key={a.id}
                      onSelect={() => {
                        setAutoId(a.id.toString());
                        setTouched((prev) => ({ ...prev, autoId: true }));
                      }}
                    >
                      {a.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {touched.autoId && !autoId && (
          <p className="text-sm text-red-500">Поле обязательно</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Текст для поиска</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between min-h-20 whitespace-normal"
            >
              {textForSearchId
                ? textsForSearch.find(
                    (t) => t.id.toString() === textForSearchId
                  )?.text
                : "Выберите текст"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] max-h-[300px] overflow-auto p-0">
            <Command>
              <CommandInput placeholder="Поиск текста..." />
              <CommandList>
                <CommandEmpty>Ничего не найдено</CommandEmpty>
                <CommandGroup>
                  {textsForSearch.map((t) => (
                    <CommandItem
                      key={t.id}
                      onSelect={() => {
                        setTextForSearchId(t.id.toString());
                        setTouched((prev) => ({
                          ...prev,
                          textForSearchId: true,
                        }));
                      }}
                    >
                      {t.text}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 mt-4">
          <h4 className="text-sm font-medium">Наличие на базах</h4>
          {warehouses.map((wh) => (
            <div key={wh.id} className="flex items-center gap-2">
              <label className="w-1/6 text-sm text-right">{wh.name}</label>
              <Input
                type="number"
                min={0}
                value={
                  stockByWarehouse[wh.id] === undefined
                    ? ""
                    : stockByWarehouse[wh.id] === 0
                    ? ""
                    : stockByWarehouse[wh.id]
                }
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
      <div className="flex justify-start">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Сохранение..." : isNew ? "Добавить" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
