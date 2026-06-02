import db from '@/lib/db/db';
import { unstable_cache } from 'next/cache';

// Полный каталог + справочники, общий для дашборда (/api/autoparts/full)
// и витрины (/shop). Кэшируется с тегом "autoparts" — сбрасывается из всех
// мутаций автозапчастей через revalidateTag("autoparts").
export const getFullCatalog = unstable_cache(
  async () => {
    const [autoparts, brands, warehouses, categories, autos, engineVolumes, textsForSearch, fuelTypes] =
      await Promise.all([
        db.autoparts.findMany({
          include: {
            category: true,
            brand: true,
            fuelType: true,
            autos: { include: { auto: true } },
            engineVolumes: { include: { engineVolume: true } },
            textForSearch: true,
            warehouses: {
              include: { warehouse: { select: { id: true, name: true } } },
            },
            prices: {
              include: { priceType: true },
              orderBy: { priceType: { name: 'asc' } },
            },
            analoguesA: {
              include: { partB: { include: { brand: true, category: true } } },
            },
            analoguesB: {
              include: { partA: { include: { brand: true, category: true } } },
            },
          },
        }),
        db.brands.findMany({ orderBy: { name: 'asc' } }),
        db.warehouses.findMany({ orderBy: { name: 'asc' } }),
        db.categories.findMany({ orderBy: { name: 'asc' } }),
        db.auto.findMany({ orderBy: { name: 'asc' } }),
        db.engineVolume.findMany({ orderBy: { name: 'asc' } }),
        db.textForAuthopartsSearch.findMany({ orderBy: { text: 'asc' } }),
        db.fuelType.findMany({ orderBy: { name: 'asc' } }),
      ]);

    const parts = autoparts.map((part) => {
      const analoguesFromA = part.analoguesA.map((a) => a.partB);
      const analoguesFromB = part.analoguesB.map((a) => a.partA);
      const allAnalogues = [...analoguesFromA, ...analoguesFromB];

      return {
        id: part.id,
        article: part.article,
        description: part.description,
        maxNumberShown: part.maxNumberShown,
        year_from: part.year_from,
        year_to: part.year_to,
        category: part.category,
        brand: part.brand,
        fuelType: part.fuelType,
        autos: part.autos.map((a) => a.auto),
        engineVolumes: part.engineVolumes.map((ev) => ev.engineVolume),
        textForSearch: part.textForSearch,
        totalQuantity: part.warehouses.reduce((sum, w) => sum + w.quantity, 0),
        warehouses: part.warehouses.map((w) => ({
          warehouseId: w.warehouse.id,
          warehouseName: w.warehouse.name,
          quantity: w.quantity,
        })),
        prices: part.prices.map((pr) => ({ price: pr.price, priceType: pr.priceType })),
        analogues: allAnalogues.map((a) => ({
          id: a.id,
          article: a.article,
          description: a.description,
          brand: a.brand,
          category: a.category,
        })),
      };
    });

    return { parts, brands, warehouses, categories, autos, engineVolumes, textsForSearch, fuelTypes };
  },
  ['autoparts-full-data'],
  { tags: ['autoparts'] }
);
