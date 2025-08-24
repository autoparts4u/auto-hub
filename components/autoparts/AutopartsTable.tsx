"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AutopartWithStock } from "@/app/types/autoparts";
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
  // FileText,
  Tags,
  ArrowUpAZ,
  ArrowDownAZ,
  Check,
  RotateCcw,
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
  const router = useRouter();

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

  const filteredParts = parts
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedBrands([]);
    setSelectedWarehouses([]);
    setSelectedCategories([]);
    setSelectedAutos([]);
    setSelectedTextsForSearch([]);
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
          <h2 className="text-2xl font-semibold tracking-tight"></h2>
          <div className="flex gap-4">
            {!onlyView && <ImportAutopartsButton />}
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить
            </Button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 bg-white border-b mb-4 flex flex-wrap gap-4 items-end p-2">
        <Input
          placeholder="Поиск по описанию или артикулу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                            setSelectedAutos((prev) =>
                              isSelected
                                ? prev.filter((name) => name !== autoName)
                                : [...prev, autoName]
                            );
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
                            setSelectedCategories((prev) =>
                              isSelected
                                ? prev.filter((name) => name !== categoryName)
                                : [...prev, categoryName]
                            );
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
                            setSelectedBrands(
                              (prev) =>
                                isSelected
                                  ? prev.filter((name) => name !== b.name) // убрать
                                  : [...prev, b.name] // добавить
                            );
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
                              setSelectedWarehouses((prev) =>
                                isSelected
                                  ? prev.filter((name) => name !== w.name)
                                  : [...prev, w.name]
                              );
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
                              setSelectedTextsForSearch((prev) =>
                                isSelected
                                  ? prev.filter(
                                      (textContent) => textContent !== text
                                    )
                                  : [...prev, text]
                              );
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
      </div>
      <Label className="w-fit hover:bg-accent/50 flex items-start gap-3 rounded-lg border px-3 py-2 mb-2 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
        <Checkbox
          id="inStock"
          checked={onlyInStock}
          onCheckedChange={setOnlyInStock}
          className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
        />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">В наличии</p>
        </div>
      </Label>
      <div className="overflow-auto rounded-md border">
        <table className="min-w-full table-auto text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
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
          <tbody>
            {filteredParts.map((p) => (
              <tr
                key={p.id}
                className="border-t hover:bg-accent/40 transition-colors"
              >
                <td className="p-3 font-mono font-medium">{p.article}</td>
                {!onlyView && <td className="p-3">{p.brand?.name}</td>}
                <td className="p-3">{p.description}</td>
                {!onlyView && <td className="p-3">{p.category?.name}</td>}
                {!onlyView && <td className="p-3">{p.auto?.name}</td>}
                <td className="p-3">
                  {!onlyView
                    ? p.totalQuantity
                    : `${(() => {
                        const quantity = p.warehouses.find(
                          (warehouse) =>
                            warehouse.warehouseId === warehouseAccessId
                        )?.quantity;
                        return quantity
                          ? quantity > p.maxNumberShown
                            ? `${p.maxNumberShown}+`
                            : quantity
                          : "0";
                      })()} (${
                        p.totalQuantity > p.maxNumberShown
                          ? `${p.maxNumberShown}+`
                          : p.totalQuantity
                      })`}
                </td>
                {!onlyView && (
                  <td className="p-3">
                    <ul className="space-y-1">
                      {p.warehouses.map(
                        (w) =>
                          w.quantity > 0 && (
                            <li key={w.warehouseId} className="text-xs">
                              {w.warehouseName}:{" "}
                              <span className="font-semibold">
                                {w.quantity}
                              </span>
                            </li>
                          )
                      )}
                    </ul>
                  </td>
                )}
                <td className="p-3 whitespace-nowrap">
                  {!onlyView && !priceAccessId ? (
                    <ul className="space-y-1 text-xs text-left">
                      {p.prices.map((price) => (
                        <li key={price.priceType.id}>
                          <span className="font-semibold">
                            {price.priceType.name}:
                          </span>{" "}
                          {price.price.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    `${
                      p.prices
                        .find((price) => price.priceType.id === priceAccessId)
                        ?.price.toFixed(2) ?? "-"
                    }`
                  )}
                </td>
                {!onlyView && (
                  <td className="p-3">
                    {p.textForSearch && <Check className={`h-4 w-4`} />}
                  </td>
                )}
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
            {creating ? "Добавить деталь" : "Редактировать деталь"}
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
