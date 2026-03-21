import db from "@/lib/db/db";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getFullData = unstable_cache(
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
              orderBy: { priceType: { name: "asc" } },
            },
            analoguesA: {
              include: { partB: { include: { brand: true, category: true } } },
            },
            analoguesB: {
              include: { partA: { include: { brand: true, category: true } } },
            },
          },
        }),
        db.brands.findMany({ orderBy: { name: "asc" } }),
        db.warehouses.findMany({ orderBy: { name: "asc" } }),
        db.categories.findMany({ orderBy: { name: "asc" } }),
        db.auto.findMany({ orderBy: { name: "asc" } }),
        db.engineVolume.findMany({ orderBy: { name: "asc" } }),
        db.textForAuthopartsSearch.findMany({ orderBy: { text: "asc" } }),
        db.fuelType.findMany({ orderBy: { name: "asc" } }),
      ]);

    const parts = autoparts.map((part) => {
      const analoguesFromA = part.analoguesA.map((a) => a.partB);
      const analoguesFromB = part.analoguesB.map((a) => a.partA);
      const allAnalogues = [...analoguesFromA, ...analoguesFromB];
      const p = part as typeof part & { year_from: number | null; year_to: number | null };

      return {
        id: p.id,
        article: p.article,
        description: p.description,
        maxNumberShown: p.maxNumberShown,
        year_from: p.year_from,
        year_to: p.year_to,
        category: p.category,
        brand: p.brand,
        fuelType: p.fuelType,
        autos: p.autos.map((a) => a.auto),
        engineVolumes: p.engineVolumes.map((ev) => ev.engineVolume),
        textForSearch: p.textForSearch,
        totalQuantity: p.warehouses.reduce((sum, w) => sum + w.quantity, 0),
        warehouses: p.warehouses.map((w) => ({
          warehouseId: w.warehouse.id,
          warehouseName: w.warehouse.name,
          quantity: w.quantity,
        })),
        prices: p.prices.map((pr) => ({ price: pr.price, priceType: pr.priceType })),
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
  ["autoparts-full-data"],
  { tags: ["autoparts"] }
);

export async function GET() {
  try {
    const data = await getFullData();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 });
  }
}
