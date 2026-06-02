'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface AnalyticsComboboxProps<T> {
  /** Текущая подпись выбранного элемента (для триггера). */
  selectedLabel?: string | null;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  /** Серверный поиск. Возвращает список элементов. */
  onSearch: (query: string) => Promise<T[]>;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  /** Минимальная длина запроса для поиска (по умолчанию 1). */
  minChars?: number;
}

export function AnalyticsCombobox<T>({
  selectedLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  onSearch,
  getKey,
  renderItem,
  onSelect,
  minChars = 1,
}: AnalyticsComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < minChars) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        setItems(await onSearch(q.trim()));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch, minChars]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between sm:w-80 font-normal"
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Поиск...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {query.trim().length < minChars ? searchPlaceholder : emptyText}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const key = getKey(item);
                    return (
                      <CommandItem
                        key={key}
                        value={key}
                        onSelect={() => {
                          onSelect(item);
                          setOpen(false);
                          setQuery('');
                          setItems([]);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            selectedLabel && getKey(item) === selectedLabel
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span className="min-w-0 flex-1">{renderItem(item)}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
