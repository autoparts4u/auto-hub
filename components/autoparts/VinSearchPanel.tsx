'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanSearch, Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVinError, normalizeVin, type DecodedVin } from '@/lib/utils/vin';
import {
  matchVinToFilters,
  type DictionaryItem,
  type VinFilterMatch,
} from '@/lib/utils/vinFilterMatch';
import {
  fuelLabel,
  driveLabel,
  bodyLabel,
  countryLabel,
  transmissionLabel,
} from '@/lib/utils/vinLabels';

/** Поля фильтра, которые умеет заполнять VIN. */
type VinField = 'autos' | 'engineVolumes' | 'fuelTypes' | 'year';

/** Порядок, в котором фильтры снимаются, если вместе они дают пустую выдачу. */
const RELAX_ORDER: VinField[] = ['year', 'fuelTypes', 'engineVolumes'];

type Enabled = Record<VinField, boolean>;

const ALL_ENABLED: Enabled = {
  autos: true,
  engineVolumes: true,
  fuelTypes: true,
  year: true,
};

/** Оставляет в наборе только включённые поля. */
function applyEnabled(match: VinFilterMatch, enabled: Enabled): VinFilterMatch {
  return {
    ...match,
    autos: enabled.autos ? match.autos : [],
    engineVolumes: enabled.engineVolumes ? match.engineVolumes : [],
    fuelTypes: enabled.fuelTypes ? match.fuelTypes : [],
    year: enabled.year ? match.year : '',
  };
}

function hasValues(match: VinFilterMatch, field: VinField): boolean {
  return field === 'year' ? Boolean(match.year) : match[field].length > 0;
}

function countSelected(match: VinFilterMatch, enabled: Enabled): number {
  return (
    (enabled.autos ? match.autos.length : 0) +
    (enabled.engineVolumes ? match.engineVolumes.length : 0) +
    (enabled.fuelTypes ? match.fuelTypes.length : 0) +
    (enabled.year && match.year ? 1 : 0)
  );
}

interface Props {
  autos: DictionaryItem[];
  engineVolumes: DictionaryItem[];
  fuelTypes: DictionaryItem[];
  /** Подставляет значения в текущие фильтры. */
  onApply: (match: VinFilterMatch) => void;
  /** Сколько деталей останется при таком наборе значений. */
  countParts: (match: VinFilterMatch) => number;
  /** VIN хранится у родителя, чтобы его можно было перенести из строки поиска. */
  vin: string;
  onVinChange: (vin: string) => void;
  /** Вызывается после применения — нужно, чтобы закрыть поповер. */
  onApplied?: () => void;
  className?: string;
}

/** Поле ввода VIN, расшифровка и подстановка результата в фильтры. */
export default function VinSearchPanel({
  autos,
  engineVolumes,
  fuelTypes,
  onApply,
  countParts,
  vin,
  onVinChange,
  onApplied,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [decoded, setDecoded] = useState<DecodedVin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Enabled>(ALL_ENABLED);

  const normalized = normalizeVin(vin);
  const validationError = normalized.length > 0 ? getVinError(normalized) : null;
  const canSubmit = normalized.length === 17 && !validationError && !loading;

  const match = decoded
    ? matchVinToFilters(decoded, { autos, engineVolumes, fuelTypes })
    : null;

  const selection = match ? applyEnabled(match, enabled) : null;
  const partsCount = selection ? countParts(selection) : 0;
  const selectedCount = match ? countSelected(match, enabled) : 0;

  const reset = () => {
    setDecoded(null);
    setError(null);
    setEnabled(ALL_ENABLED);
  };

  const handleDecode = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setDecoded(null);
    try {
      const response = await fetch(`/api/vin?vin=${encodeURIComponent(normalized)}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Не удалось расшифровать VIN');
        return;
      }
      const result = data as DecodedVin;
      setDecoded(result);

      // Все значения сразу часто дают пустую выдачу: в каталоге попросту нет
      // детали ровно на эту марку, объём, топливо и год одновременно.
      // Поэтому снимаем лишние условия, пока что-то не найдётся.
      const fresh = matchVinToFilters(result, { autos, engineVolumes, fuelTypes });
      let next: Enabled = { ...ALL_ENABLED };
      if (countParts(applyEnabled(fresh, next)) === 0) {
        for (const field of RELAX_ORDER) {
          if (!hasValues(fresh, field)) continue;
          next = { ...next, [field]: false };
          if (countParts(applyEnabled(fresh, next)) > 0) break;
        }
      }
      setEnabled(next);
    } catch {
      setError('Нет связи с сервисом расшифровки. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!selection || selectedCount === 0) {
      toast.error('Не выбрано ни одного значения');
      return;
    }
    onApply(selection);
    toast.success(`Фильтры заполнены по VIN (${selectedCount})`);
    onApplied?.();
  };

  const toggle = (field: VinField) =>
    setEnabled((prev) => ({ ...prev, [field]: !prev[field] }));

  const rows: { label: string; value: string }[] = decoded
    ? (
        [
          {
            label: 'Авто',
            value: [decoded.make, decoded.model].filter(Boolean).join(' '),
          },
          {
            label: 'Год',
            value: decoded.year
              ? `${decoded.year}${decoded.yearApproximate ? ' (примерно)' : ''}`
              : '',
          },
          {
            label: 'Двигатель',
            value: [
              decoded.engineVolume ? `${decoded.engineVolume.toFixed(1)} л` : '',
              decoded.engineCylinders ? `${decoded.engineCylinders} цил.` : '',
              decoded.engineModel ?? '',
            ]
              .filter(Boolean)
              .join(', '),
          },
          {
            label: 'Топливо',
            value: decoded.isHybrid
              ? `${fuelLabel(decoded.fuelType) ?? 'Гибрид'} (гибрид)`
              : fuelLabel(decoded.fuelType) ?? '',
          },
          { label: 'Кузов', value: bodyLabel(decoded.bodyClass) ?? '' },
          { label: 'Привод', value: driveLabel(decoded.driveType) ?? '' },
          { label: 'КПП', value: transmissionLabel(decoded.transmission) ?? '' },
          {
            label: 'Комплектация',
            value: [decoded.series, decoded.trim].filter(Boolean).join(' '),
          },
          {
            label: 'Сборка',
            value: countryLabel(decoded.plantCountry) ?? decoded.region ?? '',
          },
        ] as { label: string; value: string }[]
      ).filter((row) => row.value)
    : [];

  const chipGroups: { field: VinField; values: string[] }[] = match
    ? ([
        { field: 'autos', values: match.autos },
        { field: 'engineVolumes', values: match.engineVolumes.map((v) => `${v} л`) },
        { field: 'fuelTypes', values: match.fuelTypes },
        { field: 'year', values: match.year ? [`${match.year} г.`] : [] },
      ] as { field: VinField; values: string[] }[]).filter(
        (group) => group.values.length > 0,
      )
    : [];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">VIN-код автомобиля</Label>
        <div className="flex gap-2">
          <Input
            value={vin}
            onChange={(e) => {
              onVinChange(e.target.value.toUpperCase());
              reset();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDecode();
            }}
            placeholder="17 символов, например WVWZZZ1KZAW123456"
            maxLength={25}
            autoComplete="off"
            spellCheck={false}
            className="bg-background font-mono uppercase tracking-wider"
          />
          <Button
            type="button"
            onClick={handleDecode}
            disabled={!canSubmit}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanSearch className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">Найти</span>
          </Button>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('text-destructive', !validationError && 'invisible')}>
            {validationError ?? ' '}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {normalized.length}/17
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
          {error}
        </p>
      )}

      {decoded && match && (
        <div className="rounded-md border bg-background p-3 space-y-3">
          {rows.length > 0 ? (
            <dl className="space-y-1 text-xs">
              {rows.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0">{row.label}</dt>
                  <dd className="font-medium break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              По этому VIN справочники не дали данных. Для машин, собранных в России и
              СНГ, бесплатный сервис NHTSA данных не отдаёт.
            </p>
          )}

          {chipGroups.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">
                Подставить в фильтры{' '}
                <span className="font-normal text-muted-foreground">
                  — нажмите, чтобы исключить
                </span>
              </p>
              <div className="flex flex-wrap gap-1">
                {chipGroups.map((group) =>
                  group.values.map((value) => (
                    <button
                      key={`${group.field}-${value}`}
                      type="button"
                      onClick={() => toggle(group.field)}
                      title={
                        enabled[group.field]
                          ? 'Исключить из фильтров'
                          : 'Вернуть в фильтры'
                      }
                    >
                      <Badge
                        variant={enabled[group.field] ? 'secondary' : 'outline'}
                        className={cn(
                          'font-normal cursor-pointer transition-colors',
                          !enabled[group.field] &&
                            'text-muted-foreground line-through opacity-70',
                        )}
                      >
                        {enabled[group.field] ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {value}
                      </Badge>
                    </button>
                  )),
                )}
              </div>
              <p
                className={cn(
                  'text-xs',
                  partsCount === 0
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {partsCount === 0
                  ? 'Под такой набор деталей нет — снимите лишние условия'
                  : `Подойдёт деталей: ${partsCount}`}
              </p>
            </div>
          )}

          {match.unmatched.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Нет в справочниках — фильтр не ставим:
              </p>
              <div className="flex flex-wrap gap-1">
                {match.unmatched.map((item) => (
                  <Badge
                    key={`${item.label}-${item.value}`}
                    variant="outline"
                    className="font-normal text-muted-foreground"
                  >
                    <X className="w-3 h-3" />
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleApply}
              disabled={selectedCount === 0}
            >
              Применить к фильтрам
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onVinChange('');
                reset();
              }}
            >
              Сброс
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
