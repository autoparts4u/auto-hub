"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { AutopartWithStock, AutopartFormData } from "@/app/types/autoparts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AutopartModal } from "./AutopartModal";
import { MovePartModal } from "./MovePartModal";
import { LogsModal } from "./LogsModal";
import {
  Plus,
  Pencil,
  Trash,
  ArrowRightLeft,
  Tags,
  ArrowUpAZ,
  ArrowDownAZ,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PriceEditModal } from "./PriceEditModal";
import { Auto, Categories, TextForAuthopartsSearch } from "@prisma/client";
import ImportAutopartsButton from "./ImportAutopartsButton";

interface Props {
  parts: AutopartWithStock[];
  brands: { id: number; name: string }[];
  warehouses: { id: number; name: string }[];
  categories: Categories[];
  autos: Auto[];
  textsForSearch: TextForAuthopartsSearch[];
  onlyView?: boolean;
  priceAccessId?: number | null;
  warehouseAccessId?: number | null;
}

type SortKey =
  | "article"
  | "description"
  | "brand"
  | "category"
  | "totalQuantity"
  | "auto";

export function AutopartsTable({
  parts,
  brands,
  warehouses,
  categories,
  autos,
  textsForSearch,
  onlyView,
  priceAccessId,
  warehouseAccessId,
}: Props) {
  const [selected, setSelected] = useState<AutopartWithStock | null>(null);
  const [movePart, setMovePart] = useState<AutopartWithStock | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logsPartId, setLogsPartId] = useState<string | null>(null);
  const [pricePartId, setPricePartId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAutos, setSelectedAutos] = useState<string[]>([]);
  const [selectedTextsForSearch, setSelectedTextsForSearch] = useState<
    string[]
  >([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean | "indeterminate">(
    true
  );
  const [sortKey, setSortKey] = useState<SortKey>("description");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const autopartModalRef = useRef<{ handleSubmit: () => Promise<void> }>(null);

  const handleConfirmDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/autoparts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Ошибка удаления");
      }

      toast.success("Деталь удалена");
      setDeletingId(null);
      router.refresh();
    } catch (error) {
      toast.error("Не удалось удалить деталь");
      console.error(error);
    }
  };

  const handleSubmitForm = async (formData: AutopartFormData) => {
    setSubmitting(true);

    try {
      const res = await fetch(
        creating ? "/api/autoparts" : `/api/autoparts/${selected?.id}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        throw new Error("Ошибка сохранения детали");
      }

      toast.success(selected ? "Деталь обновлена" : "Деталь добавлена");
      setSelected(null);
      setCreating(false);
      router.refresh();
    } catch (error) {
      toast.error("Ошибка сохранения детали");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Фильтрация и сортировка данных
  const filteredAndSortedParts = parts
    .filter((p) => {
      const query = search.toLowerCase().replaceAll(/[/,.-\s]/g, "");

      const matchesSelf =
        p.article
          .toLowerCase()
          .replaceAll(/[/,.-\s]/g, "")
          .includes(query) ||
        p.description
          .toLowerCase()
          .replaceAll(/[/,.-\s]/g, "")
          .includes(query) ||
        p.textForSearch?.text
          .toLowerCase()
          .replaceAll(/[/,.-\s]/g, "")
          .includes(query);

      const matchesAnalogue = p.analogues.some(
        (a) =>
          a.article
            .toLowerCase()
            .replaceAll(/[/,.-\s]/g, "")
            .includes(query) ||
          a.description
            .toLowerCase()
            .replaceAll(/[/,.-\s]/g, "")
            .includes(query)
      );

      const matchesBrand =
        !p.brand ||
        selectedBrands.length === 0 ||
        selectedBrands.includes(p.brand.name);

      const matchesWarehouse =
        selectedWarehouses.length === 0 ||
        p.warehouses.some((w) => selectedWarehouses.includes(w.warehouseName));

      const matchesCategory =
        !p.category ||
        selectedCategories.length === 0 ||
        selectedCategories.includes(p.category.name);

      const matchesAuto =
        !p.auto ||
        selectedAutos.length === 0 ||
        selectedAutos.includes(p.auto.name);

      const matchesTextsForSearch =
        selectedTextsForSearch.length === 0 ||
        (p.textForSearch &&
          selectedTextsForSearch.includes(p.textForSearch.text));

      const isInStock = onlyInStock ? p.totalQuantity > 0 : true;

      return (
        (matchesSelf || matchesAnalogue) &&
        matchesBrand &&
        matchesWarehouse &&
        matchesCategory &&
        matchesAuto &&
        matchesTextsForSearch &&
        isInStock
      );
    })
    .sort((a, b) => {
      const getValue = (part: AutopartWithStock) => {
        switch (sortKey) {
          case "article":
            return part.article.toLowerCase();
          case "description":
            return part.description.toLowerCase();
          case "brand":
            return part.brand?.name.toLowerCase();
          case "category":
            return part.category?.name.toLowerCase();
          case "auto":
            return part.auto?.name.toLowerCase();
          case "totalQuantity":
            return part.totalQuantity;
        }
      };
      const valA = getValue(a);
      const valB = getValue(b);

      if (!valA || !valB) return 0;

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Пагинация
  const totalItems = filteredAndSortedParts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredParts = filteredAndSortedParts.slice(startIndex, endIndex);

  // Сброс страницы при изменении фильтров
  const resetFilters = () => {
    setSearch("");
    setSelectedBrands([]);
    setSelectedWarehouses([]);
    setSelectedCategories([]);
    setSelectedAutos([]);
    setSelectedTextsForSearch([]);
    setCurrentPage(1);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Сброс на первую страницу при изменении сортировки
  };

  // Функции для управления пагинацией
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Обработчики для сброса страницы при изменении фильтров
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleBrandChange = (brands: string[]) => {
    setSelectedBrands(brands);
    setCurrentPage(1);
  };

  const handleWarehouseChange = (warehouses: string[]) => {
    setSelectedWarehouses(warehouses);
    setCurrentPage(1);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
    setCurrentPage(1);
  };

  const handleAutoChange = (autos: string[]) => {
    setSelectedAutos(autos);
    setCurrentPage(1);
  };

  const handleTextsForSearchChange = (texts: string[]) => {
    setSelectedTextsForSearch(texts);
    setCurrentPage(1);
  };

  const handleOnlyInStockChange = (value: boolean | "indeterminate") => {
    setOnlyInStock(value);
    setCurrentPage(1);
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
    <div className="w-full max-w-full px-4">
      {!onlyView && (
        <div className="sticky top-0 z-20 bg-background flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight"></h2>
          <div className="flex gap-4">
            {!onlyView && <ImportAutopartsButton />}
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить
            </Button>
          </div>
        </div>
      )}

      <div className={`sticky z-10 bg-background flex flex-wrap gap-4 items-end p-4 border-b mb-4 ${!onlyView ? 'top-[40px]' : 'top-0'}`}>
        <Input
          placeholder="Поиск по описанию или артикулу"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="space-y-1">
          <Label>Авто</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-between">
                {selectedAutos.length === 0
                  ? "Все"
                  : `${selectedAutos.length} выбрано`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="Поиск авто..." />
                <CommandList>
                  <CommandEmpty>Авто не найдено</CommandEmpty>
                  <CommandGroup>
                    {autos.map((auto) => {
                      const autoName = auto.name;

                      if (!autoName) return;

                      const isSelected = selectedAutos.includes(autoName);
                      return (
                        <CommandItem
                          key={autoName}
                          onSelect={() => {
                            const newAutos = isSelected
                              ? selectedAutos.filter((name) => name !== autoName)
                              : [...selectedAutos, autoName];
                            handleAutoChange(newAutos);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={`h-4 w-4 ${
                                isSelected ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {autoName}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label>Группы</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-between">
                {selectedCategories.length === 0
                  ? "Все"
                  : `${selectedCategories.length} выбрано`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="Поиск группы..." />
                <CommandList>
                  <CommandEmpty>Группа не найдена</CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => {
                      const categoryName = category.name;
                      const isSelected =
                        selectedCategories.includes(categoryName);
                      return (
                        <CommandItem
                          key={categoryName}
                          onSelect={() => {
                            const newCategories = isSelected
                              ? selectedCategories.filter((name) => name !== categoryName)
                              : [...selectedCategories, categoryName];
                            handleCategoryChange(newCategories);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={`h-4 w-4 ${
                                isSelected ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {categoryName}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label>Бренды</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-between">
                {selectedBrands.length === 0
                  ? "Все"
                  : `${selectedBrands.length} выбрано`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="Поиск бренда..." />
                <CommandList>
                  <CommandEmpty>Бренд не найден</CommandEmpty>
                  <CommandGroup>
                    {brands.map((b) => {
                      const isSelected = selectedBrands.includes(b.name);
                      return (
                        <CommandItem
                          key={b.id}
                          onSelect={() => {
                            const newBrands = isSelected
                              ? selectedBrands.filter((name) => name !== b.name)
                              : [...selectedBrands, b.name];
                            handleBrandChange(newBrands);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={`h-4 w-4 ${
                                isSelected ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {b.name}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {!onlyView && (
          <div className="space-y-1">
            <Label>Базы</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-between">
                  {selectedWarehouses.length === 0
                    ? "Все"
                    : `${selectedWarehouses.length} выбрано`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Поиск базы..." />
                  <CommandList>
                    <CommandEmpty>База не найдена</CommandEmpty>
                    <CommandGroup>
                      {warehouses.map((w) => {
                        const isSelected = selectedWarehouses.includes(w.name);
                        return (
                          <CommandItem
                            key={w.id}
                            onSelect={() => {
                              const newWarehouses = isSelected
                                ? selectedWarehouses.filter((name) => name !== w.name)
                                : [...selectedWarehouses, w.name];
                              handleWarehouseChange(newWarehouses);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`h-4 w-4 ${
                                  isSelected ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {w.name}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
        {!onlyView && (
          <div className="space-y-1">
            <Label>Текст для поиска</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-between">
                  {selectedTextsForSearch.length === 0
                    ? "Все"
                    : `${selectedTextsForSearch.length} выбрано`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Поиск текста..." />
                  <CommandList>
                    <CommandEmpty>Текст не найдено</CommandEmpty>
                    <CommandGroup>
                      {textsForSearch.map((textForSearch) => {
                        const text = textForSearch.text;

                        if (!text) return;

                        const isSelected =
                          selectedTextsForSearch.includes(text);
                        return (
                          <CommandItem
                            key={text}
                            onSelect={() => {
                              const newTexts = isSelected
                                ? selectedTextsForSearch.filter((textContent) => textContent !== text)
                                : [...selectedTextsForSearch, text];
                              handleTextsForSearchChange(newTexts);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`h-4 w-4 ${
                                  isSelected ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {text}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
        <Button onClick={() => resetFilters()}>
          <RotateCcw />
        </Button>
        <Label className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border px-3 py-2 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
          <Checkbox
            id="inStock"
            checked={onlyInStock}
            onCheckedChange={handleOnlyInStockChange}
            className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
          />
          <div className="grid gap-1.5 font-normal">
            <p className="text-sm leading-none font-medium">В наличии</p>
          </div>
        </Label>
      </div>
      {/* Десктопная таблица */}
      <div className="hidden lg:block">
        {/* Sticky заголовок */}
        <div className={`sticky z-20 bg-muted text-muted-foreground rounded-t-md border border-b-0 ${!onlyView ? 'top-[190px]' : 'top-[170px]'}`}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm text-left" style={{ minWidth: '800px', maxWidth: '1200px' }}>
              <colgroup>
                <col style={{ width: '120px' }} />
                {!onlyView && <col style={{ width: '80px' }} />}
                <col style={{ width: '200px' }} />
                {!onlyView && <col style={{ width: '100px' }} />}
                {!onlyView && <col style={{ width: '100px' }} />}
                <col style={{ width: '70px' }} />
                {!onlyView && <col style={{ width: '100px' }} />}
                <col style={{ width: '100px' }} />
                {!onlyView && <col style={{ width: '50px' }} />}
                {!onlyView && <col style={{ width: '100px' }} />}
              </colgroup>
              <thead>
              <tr>
                <th className="p-3 text-center">
                  <SortHeader label="Артикул" column="article" />
                </th>
                {!onlyView && (
                  <th className="p-3 text-center">
                    <SortHeader label="Бренд" column="brand" />
                  </th>
                )}
                <th className="p-3 text-center">
                  <SortHeader label="Описание" column="description" />
                </th>
                {!onlyView && (
                  <th className="p-3 text-center">
                    <SortHeader label="Группа" column="category" />
                  </th>
                )}
                {!onlyView && (
                  <th className="p-3 text-center">
                    <SortHeader label="Авто" column="auto" />
                  </th>
                )}
                <th className="p-3 text-center">
                  <SortHeader
                    label={onlyView ? "Кол (общ)" : "Кол-во"}
                    column="totalQuantity"
                  />
                </th>

                {!onlyView && <th className="p-3 text-center">Базы</th>}
                <th className="p-3 text-center">Цены</th>
                {!onlyView && <th className="p-3 text-center">Текст</th>}
                {!onlyView && <th className="p-3 text-center">Действия</th>}
              </tr>
            </thead>
            </table>
          </div>
        </div>
        
        {/* Тело таблицы */}
        <div className="overflow-x-auto rounded-b-md border border-t-0">
          <table className="w-full table-fixed text-sm text-left" style={{ minWidth: '800px', maxWidth: '1200px' }}>
            <colgroup>
              <col style={{ width: '120px' }} />
              {!onlyView && <col style={{ width: '80px' }} />}
              <col style={{ width: '200px' }} />
              {!onlyView && <col style={{ width: '100px' }} />}
              {!onlyView && <col style={{ width: '100px' }} />}
              <col style={{ width: '70px' }} />
              {!onlyView && <col style={{ width: '100px' }} />}
              <col style={{ width: '100px' }} />
              {!onlyView && <col style={{ width: '50px' }} />}
              {!onlyView && <col style={{ width: '100px' }} />}
            </colgroup>
            <tbody>
            {filteredParts.map((p) => (
              <tr
                key={p.id}
                className="border-t hover:bg-accent/40 transition-colors"
              >
                <td className="p-3 font-mono font-medium truncate" title={p.article}>{p.article}</td>
                {!onlyView && <td className="p-3 truncate" title={p.brand?.name}>{p.brand?.name}</td>}
                <td className="p-3 truncate" title={p.description}>{p.description}</td>
                {!onlyView && <td className="p-3 truncate" title={p.category?.name}>{p.category?.name}</td>}
                {!onlyView && <td className="p-3 truncate" title={p.auto?.name}>{p.auto?.name}</td>}
                <td className="p-3 text-center">
                  {!onlyView ? (
                    p.totalQuantity
                  ) : warehouseAccessId ? (
                    <>
                      {(() => {
                        const quantity = p.warehouses.find(
                          (warehouse) =>
                            warehouse.warehouseId === warehouseAccessId
                        )?.quantity;
                        return quantity
                          ? quantity > p.maxNumberShown
                            ? `${p.maxNumberShown}>`
                            : quantity
                          : "0";
                      })()}
                      <span className="text-muted-foreground">
                        {" "}
                        (
                        {p.totalQuantity > p.maxNumberShown
                          ? `${p.maxNumberShown}>`
                          : p.totalQuantity}
                        )
                      </span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                {!onlyView && (
                  <td className="p-3">
                    <div className="max-h-20 overflow-y-auto">
                      <ul className="space-y-1">
                        {p.warehouses.map(
                          (w) =>
                            w.quantity > 0 && (
                              <li key={w.warehouseId} className="text-xs truncate">
                                {w.warehouseName}:{" "}
                                <span className="font-semibold">
                                  {w.quantity}
                                </span>
                              </li>
                            )
                        )}
                      </ul>
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <div className="max-h-20 overflow-y-auto">
                    {!onlyView && !priceAccessId ? (
                      <ul className="space-y-1 text-xs text-left">
                        {p.prices.map((price) => (
                          <li key={price.priceType.id} className="truncate">
                            <span className="font-semibold">
                              {price.priceType.name}:
                            </span>{" "}
                            {price.price.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm">
                        {p.prices
                          .find((price) => price.priceType.id === priceAccessId)
                          ?.price.toFixed(2) ?? "-"}
                      </span>
                    )}
                  </div>
                </td>
                {!onlyView && (
                  <td className="p-3 text-center">
                    {p.textForSearch && <Check className={`h-4 w-4`} />}
                  </td>
                )}
                {!onlyView && (
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
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
                    </div>
                  </td>
                )}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Мобильная версия таблицы */}
      <div className="lg:hidden space-y-4">
        {filteredParts.map((p) => (
          <div key={p.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-mono font-medium text-sm truncate" title={p.article}>
                  {p.article}
                </h3>
                <p className="text-sm text-muted-foreground truncate" title={p.description}>
                  {p.description}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{p.totalQuantity}</div>
                <div className="text-muted-foreground">шт.</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {!onlyView && p.brand && (
                <div>
                  <span className="text-muted-foreground">Бренд:</span>
                  <div className="font-medium truncate" title={p.brand.name}>
                    {p.brand.name}
                  </div>
                </div>
              )}
              {!onlyView && p.category && (
                <div>
                  <span className="text-muted-foreground">Группа:</span>
                  <div className="font-medium truncate" title={p.category.name}>
                    {p.category.name}
                  </div>
                </div>
              )}
              {!onlyView && p.auto && (
                <div>
                  <span className="text-muted-foreground">Авто:</span>
                  <div className="font-medium truncate" title={p.auto.name}>
                    {p.auto.name}
                  </div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Цена:</span>
                <div className="font-medium">
                  {!onlyView && !priceAccessId ? (
                    p.prices.length > 0 ? `${p.prices[0].price.toFixed(2)}` : "-"
                  ) : (
                    p.prices
                      .find((price) => price.priceType.id === priceAccessId)
                      ?.price.toFixed(2) ?? "-"
                  )}
                </div>
              </div>
            </div>

            {!onlyView && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  {p.textForSearch && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3" />
                      <span>Есть текст</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
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
                          size="sm"
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
                          size="sm"
                          onClick={() => setPricePartId(p.id)}
                        >
                          <Tags className="w-4 h-4 text-green-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Редактировать цены</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
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
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="pageSize" className="text-sm">
            Показать:
          </Label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span className="text-sm text-muted-foreground">
            из {totalItems} записей
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Показываем номера страниц */}
            {(() => {
              const pages = [];
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={i === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(i)}
                    className="w-8 h-8 p-0"
                  >
                    {i}
                  </Button>
                );
              }
              return pages;
            })()}
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
            {creating ? "Добавить деталь" : "Редактировать деталь"}
          </DialogTitle>
          <div className="absolute top-4 right-12">
            <Button 
              onClick={() => autopartModalRef.current?.handleSubmit()} 
              disabled={submitting}
              size="sm"
            >
              {submitting ? "Сохранение..." : creating ? "Добавить" : "Сохранить"}
            </Button>
          </div>
          <AutopartModal
            ref={autopartModalRef}
            part={selected}
            onClose={() => {
              setSelected(null);
              setCreating(false);
            }}
            onSubmit={handleSubmitForm}
            submitting={submitting}
            isNew={creating}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!movePart} onOpenChange={() => setMovePart(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Переместить деталь</DialogTitle>
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
          <DialogTitle>Удалить деталь?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Это действие необратимо. Вы уверены, что хотите удалить деталь?
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
