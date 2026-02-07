"use client";

import { useState, useRef, useEffect } from "react";
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
  Filter,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PriceEditModal } from "./PriceEditModal";
import { Auto, Categories, TextForAuthopartsSearch, EngineVolume, FuelType } from "@prisma/client";
import ImportAutopartsButton from "./ImportAutopartsButton";

interface Props {
  parts: AutopartWithStock[];
  brands: { id: number; name: string }[];
  warehouses: { id: number; name: string }[];
  categories: Categories[];
  autos: Auto[];
  engineVolumes: EngineVolume[];
  textsForSearch: TextForAuthopartsSearch[];
  fuelTypes?: FuelType[];
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
  engineVolumes,
  textsForSearch,
  fuelTypes = [],
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
  const [selectedEngineVolumes, setSelectedEngineVolumes] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<string>("");
  const [selectedTextsForSearch, setSelectedTextsForSearch] = useState<
    string[]
  >([]);
  const [onlyInStock, setOnlyInStock] = useState<boolean | "indeterminate">(
    false
  );
  const [sortKey, setSortKey] = useState<SortKey>("description");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const router = useRouter();
  const autopartModalRef = useRef<{ handleSubmit: () => Promise<void> }>(null);
  const lastScrollY = useRef(0);
  const filtersModalContentRef = useRef<HTMLDivElement>(null);
  const filtersModalTitleRef = useRef<HTMLDivElement>(null);

  // Автоматическое скрытие фильтров при скролле вниз на мобильных
  useEffect(() => {
    const handleScroll = () => {
      // Только на мобильных устройствах
      if (window.innerWidth >= 768) return;
      
      const currentScrollY = window.scrollY;
      
      // Если скроллим вниз больше чем на 50px и фильтры открыты - скрываем
      if (currentScrollY > lastScrollY.current && currentScrollY > 100 && showFilters) {
        setShowFilters(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showFilters]);

  // Закрытие модального окна фильтров при изменении размера на десктоп
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && showFiltersModal) {
        setShowFiltersModal(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showFiltersModal]);

  // Прокрутка контента фильтров наверх при открытии
  useEffect(() => {
    if (showFiltersModal) {
      // Множественные попытки сброса прокрутки для надежности
      const scrollToTop = () => {
        if (filtersModalContentRef.current) {
          filtersModalContentRef.current.scrollTop = 0;
        }
      };
      
      // Сразу
      scrollToTop();
      
      // Через requestAnimationFrame
      const rafId = requestAnimationFrame(scrollToTop);
      
      // И через небольшие задержки
      const timers = [
        setTimeout(scrollToTop, 0),
        setTimeout(scrollToTop, 50),
        setTimeout(scrollToTop, 100),
        setTimeout(scrollToTop, 200),
      ];
      
      return () => {
        cancelAnimationFrame(rafId);
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [showFiltersModal]);

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
        selectedAutos.length === 0 ||
        p.autos.some((auto) => selectedAutos.includes(auto.name));

      const matchesEngineVolume =
        selectedEngineVolumes.length === 0 ||
        p.engineVolumes.some((ev) => selectedEngineVolumes.includes(ev.name));

      const matchesFuelType =
        selectedFuelTypes.length === 0 ||
        (p.fuelType && selectedFuelTypes.includes(p.fuelType.name));

      const matchesYear = 
        !filterYear ||
        (
          (p.year_from == null || (typeof p.year_from === 'number' && p.year_from <= Number(filterYear))) &&
          (p.year_to == null || (typeof p.year_to === 'number' && p.year_to >= Number(filterYear)))
        );

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
        matchesEngineVolume &&
        matchesFuelType &&
        matchesYear &&
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
            return part.autos.map((a) => a.name).join(", ").toLowerCase();
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
    setSelectedEngineVolumes([]);
    setSelectedFuelTypes([]);
    setFilterYear("");
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

  // Подсчет активных фильтров
  const getActiveFiltersCount = () => {
    let count = 0;
    if (search) count++;
    if (selectedBrands.length > 0) count++;
    if (selectedWarehouses.length > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedAutos.length > 0) count++;
    if (selectedEngineVolumes.length > 0) count++;
    if (selectedFuelTypes.length > 0) count++;
    if (filterYear) count++;
    if (selectedTextsForSearch.length > 0) count++;
    if (!onlyInStock) count++; // Считаем если фильтр "только в наличии" выключен
    return count;
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
        <div className="md:sticky md:top-0 z-20 bg-background flex items-center justify-between py-2 md:py-0">
          <h2 className="text-2xl font-semibold tracking-tight"></h2>
          <div className="flex gap-4">
            {!onlyView && <ImportAutopartsButton />}
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Добавить
            </Button>
          </div>
        </div>
      )}

      {/* Панель фильтров */}
      <div className={`md:sticky z-10 bg-background border-b mb-4 transition-all duration-300 ${!onlyView ? 'mt-4 md:mt-0 md:top-[40px]' : 'md:top-0'} ${showFilters ? 'p-4' : 'p-0 h-0 overflow-hidden border-0'}`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b md:border-0">
          <h3 className="text-base md:text-sm font-semibold flex items-center gap-2 text-foreground">
            <Filter className="w-5 h-5 md:w-4 md:h-4 text-primary" />
            Фильтры
            {getActiveFiltersCount() > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                {getActiveFiltersCount()}
              </span>
            )}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFilters(false)}
            className="h-8 w-8 p-0 md:hidden hover:bg-destructive/10"
            title="Скрыть фильтры"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
        <Input
          placeholder="Поиск по описанию или артикулу"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="space-y-1 w-full sm:w-auto">
          <Label>Параметры авто</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[240px] justify-between">
                {selectedAutos.length === 0 && selectedEngineVolumes.length === 0 && selectedFuelTypes.length === 0 && !filterYear
                  ? "Все"
                  : `Фильтры (${selectedAutos.length + selectedEngineVolumes.length + selectedFuelTypes.length + (filterYear ? 1 : 0)})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[320px] p-4 overflow-y-auto"
              align="start"
              side="bottom"
              sideOffset={8}
              avoidCollisions={true}
              collisionPadding={20}
              style={{ 
                maxHeight: 'min(600px, calc(100vh - 120px))',
                maxWidth: 'calc(100vw - 40px)'
              }}
            >
              <div className="space-y-4">
                {/* Марки авто */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Марки авто</Label>
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Поиск марки..." />
                    <CommandList className="max-h-[150px]">
                      <CommandEmpty>Марка не найдена</CommandEmpty>
                      <CommandGroup>
                        {autos.map((auto) => {
                          const autoName = auto.name;
                          if (!autoName) return null;
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
                  {selectedAutos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAutos.map((auto) => (
                        <span
                          key={auto}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md cursor-pointer hover:bg-primary/20"
                          onClick={() => handleAutoChange(selectedAutos.filter((a) => a !== auto))}
                        >
                          {auto}
                          <span className="text-xs">×</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Виды топлива */}
                {fuelTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Виды топлива</Label>
                    <Command className="border rounded-md">
                      <CommandInput placeholder="Поиск вида топлива..." />
                      <CommandList className="max-h-[150px]">
                        <CommandEmpty>Вид топлива не найден</CommandEmpty>
                        <CommandGroup>
                          {fuelTypes.map((ft) => {
                            const fuelTypeName = ft.name;
                            if (!fuelTypeName) return null;
                            const isSelected = selectedFuelTypes.includes(fuelTypeName);
                            return (
                              <CommandItem
                                key={ft.id}
                                onSelect={() => {
                                  const newFuelTypes = isSelected
                                    ? selectedFuelTypes.filter((name) => name !== fuelTypeName)
                                    : [...selectedFuelTypes, fuelTypeName];
                                  setSelectedFuelTypes(newFuelTypes);
                                  setCurrentPage(1);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Check
                                    className={`h-4 w-4 ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {fuelTypeName}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {selectedFuelTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFuelTypes.map((fuelType) => (
                          <span
                            key={fuelType}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md cursor-pointer hover:bg-primary/20"
                            onClick={() => setSelectedFuelTypes(selectedFuelTypes.filter((ft) => ft !== fuelType))}
                          >
                            {fuelType}
                            <span className="text-xs">×</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Объемы двигателя */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Объемы двигателя</Label>
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Поиск объема..." />
                    <CommandList className="max-h-[150px]">
                      <CommandEmpty>Объем не найден</CommandEmpty>
                      <CommandGroup>
                        {engineVolumes.map((ev) => {
                          const volumeName = ev.name;
                          if (!volumeName) return null;
                          const isSelected = selectedEngineVolumes.includes(volumeName);
                          return (
                            <CommandItem
                              key={ev.id}
                              onSelect={() => {
                                const newVolumes = isSelected
                                  ? selectedEngineVolumes.filter((name) => name !== volumeName)
                                  : [...selectedEngineVolumes, volumeName];
                                setSelectedEngineVolumes(newVolumes);
                                setCurrentPage(1);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Check
                                  className={`h-4 w-4 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {volumeName}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  {selectedEngineVolumes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEngineVolumes.map((volume) => (
                        <span
                          key={volume}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md cursor-pointer hover:bg-primary/20"
                          onClick={() => setSelectedEngineVolumes(selectedEngineVolumes.filter((v) => v !== volume))}
                        >
                          {volume}
                          <span className="text-xs">×</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Год */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Год выпуска</Label>
                  <Input
                    type="number"
                    placeholder="Введите год"
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9"
                    min="1900"
                    max="2100"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1 w-full sm:w-auto">
          <Label>Группы</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[240px] justify-between">
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
        <div className="space-y-1 w-full sm:w-auto">
          <Label>Бренды</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[240px] justify-between">
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
          <div className="space-y-1 w-full sm:w-auto">
            <Label>Базы</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[240px] justify-between">
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
          <div className="space-y-1 w-full sm:w-auto">
            <Label>Текст для поиска</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[240px] justify-between">
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
        <div className="flex gap-3 w-full sm:w-auto">
          <Button onClick={() => resetFilters()} className="flex-shrink-0" title="Сбросить фильтры">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Label className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border px-3 py-2 flex-1 sm:flex-initial has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
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
        </div>
      </div>

      {/* Плавающая кнопка фильтров (только мобильные) */}
      {!showFilters && (
        <div className="md:hidden fixed bottom-6 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Button
            size="lg"
            onClick={() => setShowFiltersModal(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <div className="relative">
              <Filter className="w-6 h-6" />
              {getActiveFiltersCount() > 0 && (
                <span className="absolute -top-2 -right-2 text-xs font-bold">
                  {getActiveFiltersCount()}
                </span>
              )}
            </div>
          </Button>
        </div>
      )}

      {/* Десктопная и планшетная таблица */}
      <div className="hidden md:block rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
              <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                <SortHeader label="Артикул" column="article" />
              </th>
              {!onlyView && (
                <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                  <SortHeader label="Бренд" column="brand" />
                </th>
              )}
              <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                <SortHeader label="Описание" column="description" />
              </th>
              {!onlyView && (
                <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                  <SortHeader label="Группа" column="category" />
                </th>
              )}
              {!onlyView && (
                <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                  <SortHeader label="Авто" column="auto" />
                </th>
              )}
              {!onlyView && (
                <th className="px-2 py-3.5 text-center text-xs font-semibold tracking-wider border-r w-24">
                  Объем
                </th>
              )}
              {!onlyView && (
                <th className="px-2 py-3.5 text-center text-xs font-semibold tracking-wider border-r w-24">
                  Годы
                </th>
              )}
              <th className="px-2 py-3.5 text-center text-xs font-semibold tracking-wider border-r w-20">
                <SortHeader
                  label={onlyView ? "Кол (общ)" : "Кол-во"}
                  column="totalQuantity"
                />
              </th>
              {!onlyView && (
                <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                  Базы
                </th>
              )}
              <th className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider border-r">
                Цены
              </th>
              {!onlyView && (
                <th className="px-2 py-3.5 text-center text-xs font-semibold tracking-wider border-r w-16">
                  Текст
                </th>
              )}
              {!onlyView && (
                <th className="px-2 py-3.5 text-center text-xs font-semibold tracking-wider w-[70px]">
                  Действия
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-background">
            {filteredParts.map((p, index) => (
              <tr
                key={p.id}
                className={`border-b hover:bg-accent transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/50'
                }`}
              >
                <td className="px-3 py-4 text-sm font-mono font-medium border-r">
                  {p.article}
                </td>
                {!onlyView && (
                  <td className="px-3 py-4 text-sm border-r">
                    {p.brand?.name || "-"}
                  </td>
                )}
                <td className="px-3 py-4 text-sm border-r">
                  {p.description}
                </td>
                {!onlyView && (
                  <td className="px-3 py-4 text-sm border-r">
                    {p.category?.name || "-"}
                  </td>
                )}
                {!onlyView && (
                  <td className="px-3 py-4 text-sm border-r">
                    {p.autos.map((a) => a.name).join(", ") || "-"}
                  </td>
                )}
                {!onlyView && (
                  <td className="px-2 py-4 text-xs border-r">
                    {(() => {
                      const volumes = p.engineVolumes.map((ev) => ev.name).join(", ");
                      const fuelType = p.fuelType?.name;
                      if (volumes && fuelType) {
                        return `${volumes} / ${fuelType}`;
                      } else if (volumes) {
                        return volumes;
                      } else if (fuelType) {
                        return `- / ${fuelType}`;
                      }
                      return "-";
                    })()}
                  </td>
                )}
                {!onlyView && (
                  <td className="px-2 py-4 text-sm text-center border-r">
                    <div className="text-xs">
                      {p.year_from && p.year_to ? (
                        `${p.year_from}-${p.year_to}`
                      ) : p.year_from ? (
                        `от ${p.year_from}`
                      ) : p.year_to ? (
                        `до ${p.year_to}`
                      ) : (
                        "-"
                      )}
                    </div>
                  </td>
                )}
                <td className="px-2 py-4 text-sm text-center font-semibold whitespace-nowrap border-r">
                  {!onlyView ? (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {p.totalQuantity}
                    </span>
                  ) : warehouseAccessId ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
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
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {p.totalQuantity > p.maxNumberShown
                          ? `${p.maxNumberShown}>`
                          : p.totalQuantity}
                        )
                      </span>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                {!onlyView && (
                  <td className="px-3 py-4 text-sm border-r align-top">
                    <ul className="space-y-0.5">
                      {p.warehouses.map(
                        (w) =>
                          w.quantity > 0 && (
                            <li key={w.warehouseId} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1">
                              <span className="truncate">{w.warehouseName}</span>
                              <span className="font-semibold whitespace-nowrap text-primary">
                                {w.quantity}
                              </span>
                            </li>
                          )
                      )}
                    </ul>
                  </td>
                )}
                <td className="px-3 py-4 text-sm border-r align-top">
                  {!onlyView && !priceAccessId ? (
                    <ul className="space-y-0.5">
                      {p.prices.map((price) => (
                        <li key={price.priceType.id} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded px-2 py-1">
                          <span className="font-medium truncate">
                            {price.priceType.name}:
                          </span>
                          <span className="font-semibold whitespace-nowrap text-green-600 dark:text-green-500">
                            {price.price.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {p.prices
                        .find((price) => price.priceType.id === priceAccessId)
                        ?.price.toFixed(2) ?? "-"}
                    </span>
                  )}
                </td>
                {!onlyView && (
                  <td className="px-2 py-4 text-center border-r">
                    {p.textForSearch && (
                      <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
                      </div>
                    )}
                  </td>
                )}
                {!onlyView && (
                  <td className="px-2 py-3 text-center">
                    <div className="grid grid-cols-2 gap-0.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelected(p)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
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
                              className="h-7 w-7"
                              onClick={() => setMovePart(p)}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
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
                              className="h-7 w-7"
                              onClick={() => setPricePartId(p.id)}
                            >
                              <Tags className="w-3.5 h-3.5 text-green-600" />
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
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeletingId(p.id)}
                            >
                              <Trash className="w-3.5 h-3.5 text-destructive" />
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
      <div className="md:hidden space-y-3">
        {filteredParts.map((p, index) => (
          <div key={p.id} className={`border rounded-lg hover:shadow-md transition-shadow ${
            index % 2 === 0 ? 'bg-card' : 'bg-muted/50'
          }`}>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-mono font-semibold text-sm" title={p.article}>
                    {p.article}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2" title={p.description}>
                    {p.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary">
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
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                  {onlyView && warehouseAccessId && (
                    <div className="text-xs text-center text-muted-foreground mt-1">
                      ({p.totalQuantity > p.maxNumberShown
                        ? `${p.maxNumberShown}>`
                        : p.totalQuantity})
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                {!onlyView && p.brand && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Бренд</span>
                    <div className="font-semibold truncate" title={p.brand.name}>
                      {p.brand.name}
                    </div>
                  </div>
                )}
                {!onlyView && p.category && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Группа</span>
                    <div className="font-semibold truncate" title={p.category.name}>
                      {p.category.name}
                    </div>
                  </div>
                )}
                {!onlyView && p.autos.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Авто</span>
                    <div className="font-semibold truncate" title={p.autos.map((a) => a.name).join(", ")}>
                      {p.autos.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                )}
                {!onlyView && (p.engineVolumes.length > 0 || p.fuelType) && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Объем</span>
                    <div className="font-semibold truncate" title={
                      (() => {
                        const volumes = p.engineVolumes.map((ev) => ev.name).join(", ");
                        const fuelType = p.fuelType?.name;
                        if (volumes && fuelType) {
                          return `${volumes} / ${fuelType}`;
                        } else if (volumes) {
                          return volumes;
                        } else if (fuelType) {
                          return `- / ${fuelType}`;
                        }
                        return "-";
                      })()
                    }>
                      {(() => {
                        const volumes = p.engineVolumes.map((ev) => ev.name).join(", ");
                        const fuelType = p.fuelType?.name;
                        if (volumes && fuelType) {
                          return `${volumes} / ${fuelType}`;
                        } else if (volumes) {
                          return volumes;
                        } else if (fuelType) {
                          return `- / ${fuelType}`;
                        }
                        return "-";
                      })()}
                    </div>
                  </div>
                )}
                {!onlyView && (p.year_from != null || p.year_to != null) && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Годы</span>
                    <div className="font-semibold">
                      {p.year_from && p.year_to ? (
                        `${p.year_from}-${p.year_to}`
                      ) : p.year_from ? (
                        `от ${p.year_from}`
                      ) : (
                        `до ${p.year_to}`
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Цены */}
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground font-medium mb-2">Цены</div>
                {!onlyView && !priceAccessId ? (
                  <div className="flex flex-wrap gap-2">
                    {p.prices.map((price) => (
                      <div key={price.priceType.id} className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 rounded-md px-2.5 py-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">
                          {price.priceType.name}:
                        </span>
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {price.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {p.prices
                      .find((price) => price.priceType.id === priceAccessId)
                      ?.price.toFixed(2) ?? "-"}
                  </div>
                )}
              </div>

              {/* Склады */}
              {!onlyView && p.warehouses.some((w) => w.quantity > 0) && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground font-medium mb-2">Склады</div>
                  <div className="flex flex-wrap gap-2">
                    {p.warehouses.map(
                      (w) =>
                        w.quantity > 0 && (
                          <div key={w.warehouseId} className="inline-flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1.5 text-xs">
                            <span className="truncate">{w.warehouseName}:</span>
                            <span className="font-semibold text-primary">
                              {w.quantity}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}
            </div>

            {!onlyView && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-b-lg border-t">
                <div className="flex items-center gap-2">
                  {p.textForSearch && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md">
                      <Check className="h-3.5 w-3.5" />
                      <span>Текст</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
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
                          className="h-9 w-9"
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
                          className="h-9 w-9"
                          onClick={() => setPricePartId(p.id)}
                        >
                          <Tags className="w-4 h-4 text-green-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Цены</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <Label htmlFor="pageSize" className="text-sm font-medium whitespace-nowrap">
            Показать:
          </Label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-border bg-background rounded-md px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            из <span className="font-semibold text-foreground">{totalItems}</span> записей
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Страница <span className="font-semibold text-foreground">{currentPage}</span> из <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 hidden sm:inline-flex"
              title="Первая страница"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0"
              title="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Показываем номера страниц */}
            <div className="hidden sm:flex items-center gap-1">
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
                      className="h-9 min-w-[36px] px-3 font-medium"
                    >
                      {i}
                    </Button>
                  );
                }
                return pages;
              })()}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0"
              title="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0 hidden sm:inline-flex"
              title="Последняя страница"
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex-shrink-0 flex items-center justify-between">
            <DialogTitle>
              {creating ? "Добавить деталь" : "Редактировать деталь"}
            </DialogTitle>
            <Button 
              onClick={() => autopartModalRef.current?.handleSubmit()} 
              disabled={submitting}
              size="sm"
            >
              {submitting ? "Сохранение..." : creating ? "Добавить" : "Сохранить"}
            </Button>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4">
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
          </div>
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

      {/* Модальное окно фильтров (только мобильные) */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent 
          key={String(showFiltersModal)}
          className="max-w-[95vw] w-full max-h-[90vh] p-0 flex flex-col rounded-2xl overflow-hidden"
          style={{ height: '90vh', maxHeight: '90vh' }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <div ref={filtersModalTitleRef} className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5 text-primary" />
                Фильтры
                {getActiveFiltersCount() > 0 && (
                  <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFiltersModal(false)}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                title="Закрыть"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div 
            ref={(el) => {
              filtersModalContentRef.current = el;
              if (el) {
                el.scrollTop = 0;
              }
            }}
            className="overflow-y-auto flex-1 min-h-0"
          >
          <div className="px-6 py-4 space-y-4">
            {/* Поиск */}
            <div className="space-y-2">
              <Label htmlFor="modal-search" className="text-sm font-semibold">Поиск</Label>
              <Input
                id="modal-search"
                placeholder="Поиск по описанию или артикулу"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
                autoFocus={false}
              />
            </div>

            {/* Параметры авто */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Параметры авто</Label>
              
              {/* Марки авто */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Марки авто</Label>
                <Command className="border rounded-md">
                  <CommandInput placeholder="Поиск марки..." />
                  <CommandList className="max-h-[150px]">
                    <CommandEmpty>Марка не найдена</CommandEmpty>
                    <CommandGroup>
                      {autos.map((auto) => {
                        const autoName = auto.name;
                        if (!autoName) return null;
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
                {selectedAutos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAutos.map((auto) => (
                      <span
                        key={auto}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                        onClick={() => handleAutoChange(selectedAutos.filter((a) => a !== auto))}
                      >
                        {auto}
                        <X className="w-3 h-3" />
                      </span>
                    ))}
                    </div>
                  )}
                </div>

                {/* Виды топлива */}
                {fuelTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Виды топлива</Label>
                    <Command className="border rounded-md">
                      <CommandInput placeholder="Поиск вида топлива..." />
                      <CommandList className="max-h-[150px]">
                        <CommandEmpty>Вид топлива не найден</CommandEmpty>
                        <CommandGroup>
                          {fuelTypes.map((ft) => {
                            const fuelTypeName = ft.name;
                            if (!fuelTypeName) return null;
                            const isSelected = selectedFuelTypes.includes(fuelTypeName);
                            return (
                              <CommandItem
                                key={ft.id}
                                onSelect={() => {
                                  const newFuelTypes = isSelected
                                    ? selectedFuelTypes.filter((name) => name !== fuelTypeName)
                                    : [...selectedFuelTypes, fuelTypeName];
                                  setSelectedFuelTypes(newFuelTypes);
                                  setCurrentPage(1);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Check
                                    className={`h-4 w-4 ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {fuelTypeName}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {selectedFuelTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFuelTypes.map((fuelType) => (
                          <span
                            key={fuelType}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md cursor-pointer hover:bg-primary/20"
                            onClick={() => setSelectedFuelTypes(selectedFuelTypes.filter((ft) => ft !== fuelType))}
                          >
                            {fuelType}
                            <span className="text-xs">×</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Виды топлива */}
                {fuelTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Виды топлива</Label>
                    <Command className="border rounded-md">
                      <CommandInput placeholder="Поиск вида топлива..." />
                      <CommandList className="max-h-[150px]">
                        <CommandEmpty>Вид топлива не найден</CommandEmpty>
                        <CommandGroup>
                          {fuelTypes.map((ft) => {
                            const fuelTypeName = ft.name;
                            if (!fuelTypeName) return null;
                            const isSelected = selectedFuelTypes.includes(fuelTypeName);
                            return (
                              <CommandItem
                                key={ft.id}
                                onSelect={() => {
                                  const newFuelTypes = isSelected
                                    ? selectedFuelTypes.filter((name) => name !== fuelTypeName)
                                    : [...selectedFuelTypes, fuelTypeName];
                                  setSelectedFuelTypes(newFuelTypes);
                                  setCurrentPage(1);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Check
                                    className={`h-4 w-4 ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {fuelTypeName}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {selectedFuelTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFuelTypes.map((fuelType) => (
                          <span
                            key={fuelType}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md cursor-pointer hover:bg-primary/20"
                            onClick={() => setSelectedFuelTypes(selectedFuelTypes.filter((ft) => ft !== fuelType))}
                          >
                            {fuelType}
                            <span className="text-xs">×</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Объемы двигателя */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Объемы двигателя</Label>
                <Command className="border rounded-md">
                  <CommandInput placeholder="Поиск объема..." />
                  <CommandList className="max-h-[150px]">
                    <CommandEmpty>Объем не найден</CommandEmpty>
                    <CommandGroup>
                      {engineVolumes.map((ev) => {
                        const volumeName = ev.name;
                        if (!volumeName) return null;
                        const isSelected = selectedEngineVolumes.includes(volumeName);
                        return (
                          <CommandItem
                            key={ev.id}
                            onSelect={() => {
                              const newVolumes = isSelected
                                ? selectedEngineVolumes.filter((name) => name !== volumeName)
                                : [...selectedEngineVolumes, volumeName];
                              setSelectedEngineVolumes(newVolumes);
                              setCurrentPage(1);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`h-4 w-4 ${
                                  isSelected ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {volumeName}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {selectedEngineVolumes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEngineVolumes.map((volume) => (
                      <span
                        key={volume}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                        onClick={() => setSelectedEngineVolumes(selectedEngineVolumes.filter((v) => v !== volume))}
                      >
                        {volume}
                        <X className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Год */}
              <div className="space-y-2">
                <Label htmlFor="modal-year" className="text-xs text-muted-foreground">Год выпуска</Label>
                <Input
                  id="modal-year"
                  type="number"
                  placeholder="Введите год"
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                  min="1900"
                  max="2100"
                />
              </div>
            </div>

            {/* Группы */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Группы</Label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Поиск группы..." />
                <CommandList className="max-h-[150px]">
                  <CommandEmpty>Группа не найдена</CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => {
                      const categoryName = category.name;
                      const isSelected = selectedCategories.includes(categoryName);
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
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCategories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                      onClick={() => handleCategoryChange(selectedCategories.filter((c) => c !== category))}
                    >
                      {category}
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Бренды */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Бренды</Label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Поиск бренда..." />
                <CommandList className="max-h-[150px]">
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
              {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                      onClick={() => handleBrandChange(selectedBrands.filter((b) => b !== brand))}
                    >
                      {brand}
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Базы */}
            {!onlyView && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Базы</Label>
                <Command className="border rounded-md">
                  <CommandInput placeholder="Поиск базы..." />
                  <CommandList className="max-h-[150px]">
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
                {selectedWarehouses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedWarehouses.map((warehouse) => (
                      <span
                        key={warehouse}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                        onClick={() => handleWarehouseChange(selectedWarehouses.filter((w) => w !== warehouse))}
                      >
                        {warehouse}
                        <X className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Текст для поиска */}
            {!onlyView && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Текст для поиска</Label>
                <Command className="border rounded-md">
                  <CommandInput placeholder="Поиск текста..." />
                  <CommandList className="max-h-[150px]">
                    <CommandEmpty>Текст не найден</CommandEmpty>
                    <CommandGroup>
                      {textsForSearch.map((textForSearch) => {
                        const text = textForSearch.text;
                        if (!text) return;
                        const isSelected = selectedTextsForSearch.includes(text);
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
                {selectedTextsForSearch.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTextsForSearch.map((text) => (
                      <span
                        key={text}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20"
                        onClick={() => handleTextsForSearchChange(selectedTextsForSearch.filter((t) => t !== text))}
                      >
                        {text}
                        <X className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Только в наличии */}
            <div className="pt-2">
              <Label className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/50 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
                <Checkbox
                  id="modal-inStock"
                  checked={onlyInStock}
                  onCheckedChange={handleOnlyInStockChange}
                  className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">В наличии</p>
                  <p className="text-xs text-muted-foreground mt-1">Показывать только товары в наличии</p>
                </div>
              </Label>
            </div>
          </div>
          </div>

          {/* Кнопки действий */}
          <div className="bg-background border-t px-6 py-4 flex gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                resetFilters();
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Сбросить
            </Button>
            <Button 
              className="flex-1"
              onClick={() => setShowFiltersModal(false)}
            >
              Применить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
