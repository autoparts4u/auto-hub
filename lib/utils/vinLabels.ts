/**
 * Перевод значений внешнего справочника на русский — только для показа
 * в карточке расшифровки. На сопоставление с фильтрами не влияет:
 * там работает lib/utils/vinFilterMatch.ts по своим синонимам.
 *
 * Неизвестное значение возвращается как есть: лучше английское слово,
 * чем пустое поле.
 */

const FUEL_LABELS: Record<string, string> = {
  gasoline: 'Бензин',
  petrol: 'Бензин',
  diesel: 'Дизель',
  electric: 'Электро',
  hybrid: 'Гибрид',
  ethanol: 'Этанол',
  'flexible fuel vehicle (ffv)': 'Бензин / этанол',
  'compressed natural gas (cng)': 'Метан (CNG)',
  'liquefied petroleum gas (lpg)': 'Пропан (LPG)',
  'compressed hydrogen/hydrogen': 'Водород',
  'fuel cell': 'Водородная ячейка',
};

const DRIVE_LABELS: Record<string, string> = {
  fwd: 'Передний',
  'fwd/front wheel drive': 'Передний',
  rwd: 'Задний',
  'rwd/ rear wheel drive': 'Задний',
  'rwd/rear wheel drive': 'Задний',
  awd: 'Полный',
  'awd/all wheel drive': 'Полный',
  '4wd': 'Полный',
  '4x2': '4x2 (один ведущий мост)',
  '4x4': 'Полный (4x4)',
  '6x6': 'Полный (6x6)',
};

const BODY_LABELS: Record<string, string> = {
  'sedan/saloon': 'Седан',
  'hatchback/liftback/notchback': 'Хэтчбек',
  wagon: 'Универсал',
  coupe: 'Купе',
  convertible: 'Кабриолет',
  'convertible/cabriolet': 'Кабриолет',
  'sport utility vehicle (suv)/multi-purpose vehicle (mpv)': 'Внедорожник / минивэн',
  'sport utility truck (sut)': 'Пикап-внедорожник',
  'crossover utility vehicle (cuv)': 'Кроссовер',
  'pickup': 'Пикап',
  'van': 'Фургон',
  'minivan': 'Минивэн',
  'cargo van': 'Грузовой фургон',
  'hatchback': 'Хэтчбек',
  'roadster': 'Родстер',
  'limousine': 'Лимузин',
};

const COUNTRY_LABELS: Record<string, string> = {
  japan: 'Япония',
  germany: 'Германия',
  'united states (usa)': 'США',
  usa: 'США',
  'south korea': 'Южная Корея',
  korea: 'Южная Корея',
  mexico: 'Мексика',
  canada: 'Канада',
  'united kingdom (uk)': 'Великобритания',
  'czech republic': 'Чехия',
  slovakia: 'Словакия',
  hungary: 'Венгрия',
  poland: 'Польша',
  spain: 'Испания',
  france: 'Франция',
  italy: 'Италия',
  sweden: 'Швеция',
  belgium: 'Бельгия',
  turkey: 'Турция',
  china: 'Китай',
  india: 'Индия',
  brazil: 'Бразилия',
  'south africa': 'ЮАР',
  austria: 'Австрия',
  portugal: 'Португалия',
  romania: 'Румыния',
  slovenia: 'Словения',
  netherlands: 'Нидерланды',
  finland: 'Финляндия',
  russia: 'Россия',
  'russian federation': 'Россия',
  uzbekistan: 'Узбекистан',
  ukraine: 'Украина',
  belarus: 'Беларусь',
};

function translate(map: Record<string, string>, value: string | null): string | null {
  if (!value) return null;
  return map[value.trim().toLowerCase()] ?? value;
}

export const fuelLabel = (v: string | null) => translate(FUEL_LABELS, v);
export const driveLabel = (v: string | null) => translate(DRIVE_LABELS, v);
export const bodyLabel = (v: string | null) => translate(BODY_LABELS, v);
export const countryLabel = (v: string | null) => translate(COUNTRY_LABELS, v);

/** "Automatic" / "Manual" + число передач. */
export function transmissionLabel(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/automatic/i, 'Автомат')
    .replace(/manual/i, 'Механика')
    .replace(/continuously variable transmission \(cvt\)/i, 'Вариатор')
    .replace(/dual-clutch transmission \(dct\)/i, 'Робот (DCT)');
}
