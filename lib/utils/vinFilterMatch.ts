import type { DecodedVin } from './vin';

/**
 * Сопоставление данных из VIN с существующими справочниками
 * (Auto, EngineVolume, FuelType). Чистые функции — используются на клиенте.
 *
 * Внешние справочники отдают марки латиницей ("VOLKSWAGEN"), а в базе
 * название может быть любым ("Volkswagen", "VW", "Фольксваген"), поэтому
 * сравнение идёт по нормализованной строке и по таблице синонимов.
 */

/** Русские и сокращённые написания марок. Ключ — латинское название. */
const BRAND_ALIASES: Record<string, string[]> = {
  Toyota: ['тойота'],
  Lexus: ['лексус'],
  Volkswagen: ['vw', 'фольксваген', 'фольц', 'вольксваген'],
  Audi: ['ауди'],
  BMW: ['бмв'],
  'Mercedes-Benz': ['mb', 'mercedes', 'мерседес', 'мерс', 'мерседес-бенц'],
  Lada: ['vaz', 'ваз', 'лада', 'жигули'],
  Hyundai: ['хендай', 'хундай', 'хюндай', 'хёндэ', 'хендэ'],
  Kia: ['киа'],
  Nissan: ['ниссан', 'нисан'],
  Infiniti: ['инфинити'],
  Honda: ['хонда'],
  Acura: ['акура'],
  Mazda: ['мазда'],
  Mitsubishi: ['мицубиси', 'митсубиси', 'мицубиши'],
  Subaru: ['субару'],
  Suzuki: ['сузуки', 'судзуки'],
  Ford: ['форд'],
  Opel: ['опель'],
  Renault: ['рено'],
  Peugeot: ['пежо'],
  Citroen: ['citroën', 'ситроен', 'ситроён'],
  Skoda: ['škoda', 'шкода'],
  Seat: ['сеат', 'сиат'],
  Volvo: ['вольво'],
  Saab: ['сааб'],
  Chevrolet: ['шевроле', 'шеви'],
  Daewoo: ['дэу', 'дэо', 'деу'],
  Chrysler: ['крайслер'],
  Jeep: ['джип'],
  Dodge: ['додж'],
  Ram: ['рам'],
  Cadillac: ['кадиллак'],
  'Land Rover': ['landrover', 'ленд ровер', 'лендровер'],
  Jaguar: ['ягуар'],
  Rover: ['ровер'],
  Porsche: ['порше', 'порш'],
  Mini: ['мини'],
  Fiat: ['фиат'],
  'Alfa Romeo': ['alfaromeo', 'альфа ромео', 'альфаромео', 'альфа'],
  Lancia: ['лянча', 'ланча'],
  Ferrari: ['феррари'],
  Maserati: ['мазерати'],
  Bentley: ['бентли'],
  'Rolls-Royce': ['rollsroyce', 'роллс ройс', 'роллсройс'],
  Tesla: ['тесла'],
  Smart: ['смарт'],
  Genesis: ['генезис', 'дженезис'],
  SsangYong: ['ссангйонг', 'сангйонг', 'ссанг йонг'],
  Geely: ['джили', 'геели'],
  Chery: ['чери', 'черри'],
  Haval: ['хавал', 'хавейл', 'хаваль'],
  BYD: ['бид'],
  JAC: ['джак'],
  Polestar: ['полестар'],
  UAZ: ['уаз'],
  GAZ: ['газ', 'газель'],
  KAMAZ: ['камаз'],
  ZAZ: ['заз'],
};

/**
 * Групповые записи справочника: деталь может быть заведена не на марку,
 * а на концерн. Если такая запись есть в базе — добавляем её к выбору.
 */
const BRAND_GROUPS: Record<string, string[]> = {
  Peugeot: ['PSA'],
  Citroen: ['PSA'],
  DS: ['PSA'],
  // Opel сознательно не включён: в концерн он вошёл только в 2017,
  // и для машин до этого года запись PSA была бы лишней.
};

/** Русские написания видов топлива. Ключ — значение из внешнего справочника. */
const FUEL_ALIASES: Record<string, string[]> = {
  Gasoline: ['petrol', 'бензин', 'бензиновый', 'аи', 'бенз'],
  Diesel: ['дизель', 'дизельный', 'дт', 'соляр'],
  Electric: ['ev', 'электро', 'электрический', 'электричество'],
  Hybrid: ['гибрид', 'гибридный'],
  'Natural Gas': ['cng', 'lpg', 'gas', 'газ', 'метан', 'пропан', 'гбо'],
  Ethanol: ['этанол', 'спирт'],
};

/** Нормализация для сравнения: регистр, ё→е, только буквы и цифры. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');
}

/** Варианты написания марки: само название, его части и синонимы. */
function brandVariants(make: string): string[] {
  const variants = new Set<string>([norm(make)]);
  for (const alias of BRAND_ALIASES[make] ?? []) variants.add(norm(alias));

  // Обратный проход: справочник мог отдать синоним ("VW"), а в таблице ключ — "Volkswagen".
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.some((a) => norm(a) === norm(make)) || norm(canonical) === norm(make)) {
      variants.add(norm(canonical));
      for (const alias of aliases) variants.add(norm(alias));
    }
  }
  return [...variants].filter(Boolean);
}

/**
 * Совпадает ли название из справочника с одним из вариантов.
 * Короткие названия (до 3 символов, "VW", "DS") сравниваются только целиком,
 * иначе они находятся внутри посторонних слов.
 */
function nameMatches(dictName: string, variants: string[]): boolean {
  const target = norm(dictName);
  if (!target) return false;
  return variants.some((v) =>
    v.length <= 3 ? target === v : target.includes(v) || v.includes(target),
  );
}

/** Объём двигателя из названия справочника в литрах: "1,6 л" → 1.6, "1600" → 1.6 */
export function parseEngineVolume(value: string): number | null {
  const match = value.replace(',', '.').match(/\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const litres = parsed > 100 ? parsed / 1000 : parsed;
  return Math.round(litres * 10) / 10;
}

export interface DictionaryItem {
  name: string;
}

export interface VinFilterMatch {
  /** Значения для setSelectedAutos / setSelectedEngineVolumes / setSelectedFuelTypes. */
  autos: string[];
  engineVolumes: string[];
  fuelTypes: string[];
  /** Значение для setFilterYear ('' — не определён). */
  year: string;
  /** Что расшифровали, но не нашли в справочниках — показываем как предупреждение. */
  unmatched: { label: string; value: string }[];
}

/**
 * Превращает расшифрованный VIN в набор значений для текущих фильтров.
 * Ничего не применяет — только предлагает; решение остаётся за UI.
 */
export function matchVinToFilters(
  decoded: DecodedVin,
  dictionaries: {
    autos: DictionaryItem[];
    engineVolumes: DictionaryItem[];
    fuelTypes: DictionaryItem[];
  },
): VinFilterMatch {
  const unmatched: { label: string; value: string }[] = [];

  // --- Марка авто ---
  let autos: string[] = [];
  if (decoded.make) {
    const variants = brandVariants(decoded.make);
    autos = dictionaries.autos
      .filter((a) => nameMatches(a.name, variants))
      .map((a) => a.name);

    // Если модель известна и среди совпадений есть запись именно с ней — берём её.
    if (decoded.model && autos.length > 1) {
      const modelNorm = norm(decoded.model);
      const withModel = autos.filter((name) => norm(name).includes(modelNorm));
      if (withModel.length > 0) autos = withModel;
    }

    // В справочнике могут лежать и "Ford", и "Ford USA". Для американских VIN
    // (1-5 в первом символе) берём запись для США, иначе — точное совпадение.
    if (autos.length > 1) {
      if (/^[1-5]/.test(decoded.vin)) {
        const usa = autos.filter((name) => /usa|сша/i.test(name));
        if (usa.length > 0) autos = usa;
      }
      if (autos.length > 1) {
        const exact = autos.filter((name) => variants.includes(norm(name)));
        if (exact.length > 0) autos = exact;
      }
    }

    if (autos.length === 0) {
      unmatched.push({
        label: 'Марка',
        value: [decoded.make, decoded.model].filter(Boolean).join(' '),
      });
    }

    // Концерн добавляем сверх марки: детали бывают заведены на группу.
    const groups = BRAND_GROUPS[decoded.make] ?? [];
    for (const group of groups) {
      const hit = dictionaries.autos.find((a) => norm(a.name) === norm(group));
      if (hit && !autos.includes(hit.name)) autos.push(hit.name);
    }
  }

  // --- Объём двигателя ---
  let engineVolumes: string[] = [];
  if (decoded.engineVolume !== null) {
    const target = Math.round(decoded.engineVolume * 10) / 10;
    engineVolumes = dictionaries.engineVolumes
      .filter((ev) => parseEngineVolume(ev.name) === target)
      .map((ev) => ev.name);
    if (engineVolumes.length === 0) {
      unmatched.push({ label: 'Объём', value: `${target.toFixed(1)} л` });
    }
  }

  // --- Вид топлива ---
  let fuelTypes: string[] = [];
  if (decoded.fuelType || decoded.isHybrid) {
    const source = decoded.fuelType ?? '';
    const variants = new Set<string>();
    if (source) variants.add(norm(source));
    for (const [canonical, aliases] of Object.entries(FUEL_ALIASES)) {
      const hit =
        (source && norm(source).includes(norm(canonical))) ||
        aliases.some((a) => source && norm(source).includes(norm(a)));
      if (hit) {
        variants.add(norm(canonical));
        for (const alias of aliases) variants.add(norm(alias));
      }
    }
    // Гибриду подходит и бензин, и отдельная запись "Гибрид", если она есть.
    if (decoded.isHybrid) {
      variants.add(norm('Hybrid'));
      for (const alias of FUEL_ALIASES.Hybrid) variants.add(norm(alias));
    }
    const list = [...variants].filter(Boolean);
    fuelTypes = dictionaries.fuelTypes
      .filter((f) => nameMatches(f.name, list))
      .map((f) => f.name);
    if (fuelTypes.length === 0) {
      unmatched.push({
        label: 'Топливо',
        value: decoded.isHybrid ? `${source || 'Гибрид'} (гибрид)` : source,
      });
    }
  }

  return {
    autos,
    engineVolumes,
    fuelTypes,
    year: decoded.year ? String(decoded.year) : '',
    unmatched,
  };
}
