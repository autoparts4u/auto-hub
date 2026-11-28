import { WMI_BRANDS, VIN_REGIONS } from './vinWmi';

/** Разрешённый алфавит VIN: латиница без I, O, Q + цифры. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Символы года выпуска в 10-й позиции (цикл 30 лет: 1980–2009 и 2010–2039). */
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/** Значения символов для расчёта контрольной цифры (9-я позиция). */
const CHECK_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const CHECK_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Единый результат расшифровки VIN — то, что уходит в UI. */
export interface DecodedVin {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  /** Год получен локально из 10-й позиции, а не от справочника — может быть неточным. */
  yearApproximate: boolean;
  /** Объём двигателя в литрах, например 1.6 */
  engineVolume: number | null;
  /** Тип топлива в терминах источника (англ.), например Gasoline */
  fuelType: string | null;
  /** Гибрид (HEV/PHEV). Нужен отдельно: справочник отдаёт основным топливом бензин. */
  isHybrid: boolean;
  engineCylinders: number | null;
  engineModel: string | null;
  bodyClass: string | null;
  driveType: string | null;
  transmission: string | null;
  trim: string | null;
  series: string | null;
  /** Регион по первому символу VIN. */
  region: string | null;
  /** Страна завода по данным справочника. */
  plantCountry: string | null;
  /** Контрольная цифра: true/false для VIN Северной Америки, null — не проверялась. */
  checkDigitValid: boolean | null;
  /** Какие источники дали данные. */
  sources: ('local' | 'nhtsa')[];
}

/** Приводит ввод пользователя к каноническому виду: верхний регистр, без пробелов и дефисов. */
export function normalizeVin(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** Текст ошибки на русском или null, если VIN валиден. */
export function getVinError(vin: string): string | null {
  if (vin.length === 0) return 'Введите VIN';
  if (vin.length !== 17) return `VIN должен содержать 17 символов (введено ${vin.length})`;
  if (/[IOQ]/.test(vin)) return 'VIN не может содержать буквы I, O и Q';
  if (!VIN_RE.test(vin)) return 'VIN содержит недопустимые символы';
  return null;
}

export function isValidVin(vin: string): boolean {
  return getVinError(vin) === null;
}

/**
 * Проверяет контрольную цифру (9-я позиция).
 * Обязательна только для Северной Америки и Китая — для европейских и
 * российских VIN она часто не рассчитывается, поэтому вне NA возвращаем null
 * и НИКОГДА не отклоняем VIN по этой причине.
 */
export function validateCheckDigit(vin: string): boolean | null {
  if (!VIN_RE.test(vin)) return null;
  const isNorthAmerica = /^[1-5]/.test(vin);
  if (!isNorthAmerica) return null;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const value = /\d/.test(ch) ? Number(ch) : CHECK_VALUES[ch];
    if (value === undefined) return null;
    sum += value * CHECK_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === expected;
}

/**
 * Год выпуска из 10-й позиции. Символ кодирует год внутри 30-летнего цикла,
 * поэтому кандидатов всегда два (например 'E' → 1984 или 2014).
 * Для VIN Северной Америки цикл определяется 7-й позицией (цифра → до 2009),
 * для остальных берём более свежий правдоподобный год.
 */
export function decodeYearFromVin(vin: string): number | null {
  if (vin.length !== 17) return null;
  const idx = YEAR_CODES.indexOf(vin[9]);
  if (idx === -1) return null;

  const older = 1980 + idx;
  const newer = 2010 + idx;
  const maxYear = new Date().getFullYear() + 1;

  if (/^[1-5]/.test(vin)) {
    return /\d/.test(vin[6]) ? older : newer;
  }
  return newer <= maxYear ? newer : older;
}

/**
 * Оба возможных года для 10-й позиции (цикл повторяется каждые 30 лет).
 * Нужны, чтобы понять, не выбрал ли внешний справочник заведомо старый цикл.
 */
export function getYearCandidates(vin: string): number[] {
  if (vin.length !== 17) return [];
  const idx = YEAR_CODES.indexOf(vin[9]);
  if (idx === -1) return [];
  return [1980 + idx, 2010 + idx];
}

/** Марка по таблице WMI (первые 3 символа). */
export function decodeMakeFromVin(vin: string): string | null {
  return WMI_BRANDS[vin.slice(0, 3)] ?? null;
}

/** Регион сборки по первому символу VIN. */
export function decodeRegionFromVin(vin: string): string | null {
  return VIN_REGIONS[vin[0]] ?? null;
}

/**
 * Полностью локальная расшифровка — работает всегда, без сети.
 * Это базовый слой: внешний справочник только дополняет его.
 */
export function decodeVinLocally(vin: string): DecodedVin {
  const year = decodeYearFromVin(vin);
  return {
    vin,
    make: decodeMakeFromVin(vin),
    model: null,
    year,
    yearApproximate: year !== null,
    engineVolume: null,
    fuelType: null,
    isHybrid: false,
    engineCylinders: null,
    engineModel: null,
    bodyClass: null,
    driveType: null,
    transmission: null,
    trim: null,
    series: null,
    region: decodeRegionFromVin(vin),
    plantCountry: null,
    checkDigitValid: validateCheckDigit(vin),
    sources: ['local'],
  };
}
