import {
  decodeVinLocally,
  normalizeVin,
  isValidVin,
  getYearCandidates,
  type DecodedVin,
} from '@/lib/utils/vin';

/**
 * Расшифровка VIN: локальный декодер + бесплатный справочник NHTSA vPIC.
 *
 * Почему именно так:
 *  - NHTSA (бесплатный, без ключа, без лимитов) знает только производителей,
 *    сертифицированных для рынка США. Для XTA (Lada), Z94 (Hyundai Россия),
 *    XW8 (VW Калуга) он возвращает пустой ответ с ErrorCode 7.
 *  - Поэтому базовый слой всегда локальный (марка по WMI, год по 10-й позиции),
 *    а NHTSA только дополняет его моделью, объёмом и топливом.
 *
 * Кэш: ответ NHTSA по VIN не меняется, поэтому используется Data Cache
 * Next.js на 30 дней — отдельная таблица в БД не нужна.
 */

const NHTSA_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const TIMEOUT_MS = 8000;

/** NHTSA отдаёт пустые строки и "Not Applicable" вместо отсутствия значения. */
function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(not applicable|not reported|na|n\/a)$/i.test(trimmed)) return null;
  return trimmed;
}

function cleanNumber(value: unknown): number | null {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Марки-аббревиатуры, которые нельзя переводить в Title Case ("BMW", не "Bmw"). */
const ACRONYM_BRANDS = new Set([
  'BMW', 'VW', 'MB', 'DS', 'PSA', 'JAC', 'BYD', 'GMC', 'MG', 'RAM', 'SRT', 'UAZ',
  'GAZ', 'ZAZ', 'KAMAZ', 'FAW', 'GAC', 'SAIC', 'KGM',
]);

/** "VOLKSWAGEN" → "Volkswagen": справочник отдаёт марки капсом. */
function toTitleCase(value: string | null): string | null {
  if (!value) return null;
  if (ACRONYM_BRANDS.has(value.toUpperCase())) return value.toUpperCase();
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-zа-я])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Сравнение названий марок без учёта регистра и знаков. */
function sameBrand(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
}

interface NhtsaResult {
  [key: string]: unknown;
}

async function fetchFromNhtsa(vin: string): Promise<NhtsaResult | null> {
  try {
    const response = await fetch(`${NHTSA_URL}/${vin}?format=json`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) {
      console.error('VIN decode: NHTSA responded', response.status);
      return null;
    }
    const data = (await response.json()) as { Results?: NhtsaResult[] };
    return data.Results?.[0] ?? null;
  } catch (error) {
    console.error('Error decoding VIN via NHTSA:', error);
    return null;
  }
}

/** Склеивает локальные данные с данными справочника: справочник приоритетнее. */
function merge(local: DecodedVin, remote: NhtsaResult): DecodedVin {
  const remoteMake = toTitleCase(clean(remote.Make));
  const remoteYear = cleanNumber(remote.ModelYear);
  const transmissionStyle = clean(remote.TransmissionStyle);
  const transmissionSpeeds = clean(remote.TransmissionSpeeds);

  const hasRemoteData = Boolean(remoteMake || remoteYear || clean(remote.Model));
  if (!hasRemoteData) return local;

  // Для одной и той же марки берём написание из локальной таблицы WMI:
  // справочник отдаёт капс, из которого "BMW" превращается в "Bmw".
  const make = sameBrand(remoteMake, local.make) ? local.make : remoteMake;

  // Вне Северной Америки справочник определяет год по той же 10-й позиции,
  // что и мы, и иногда берёт старший 30-летний цикл (2011 → 1981).
  // Если его ответ — это просто второй кандидат той же позиции, доверяем
  // более свежему правдоподобному году, но помечаем его как примерный.
  const isNorthAmerica = /^[1-5]/.test(local.vin);
  let year = remoteYear ?? local.year;
  let yearApproximate = remoteYear ? false : local.yearApproximate;
  if (
    remoteYear &&
    !isNorthAmerica &&
    local.year &&
    remoteYear !== local.year &&
    getYearCandidates(local.vin).includes(remoteYear)
  ) {
    year = local.year;
    yearApproximate = true;
  }

  // Гибрид: основным топливом справочник отдаёт бензин, признак — в ElectrificationLevel.
  const electrification = clean(remote.ElectrificationLevel) ?? '';
  const isHybrid = /HEV/i.test(electrification);

  return {
    ...local,
    make: make ?? local.make,
    model: clean(remote.Model),
    year,
    yearApproximate,
    engineVolume: cleanNumber(remote.DisplacementL),
    fuelType: clean(remote.FuelTypePrimary),
    isHybrid,
    engineCylinders: cleanNumber(remote.EngineCylinders),
    engineModel: clean(remote.EngineModel),
    bodyClass: clean(remote.BodyClass),
    driveType: clean(remote.DriveType),
    transmission: [transmissionStyle, transmissionSpeeds && `${transmissionSpeeds} ст.`]
      .filter(Boolean)
      .join(', ') || null,
    trim: clean(remote.Trim),
    series: clean(remote.Series),
    plantCountry: toTitleCase(clean(remote.PlantCountry)),
    sources: ['local', 'nhtsa'],
  };
}

/**
 * Основная точка входа. Никогда не бросает исключение из-за сети:
 * при недоступности справочника возвращает локальную расшифровку.
 */
export async function decodeVin(rawVin: string): Promise<DecodedVin | null> {
  const vin = normalizeVin(rawVin);
  if (!isValidVin(vin)) return null;

  const local = decodeVinLocally(vin);
  const remote = await fetchFromNhtsa(vin);
  return remote ? merge(local, remote) : local;
}
