// app/dashboard/parts/page.tsx
import db from "@/lib/db/db";
import { AutopartsTable } from "@/components/autoparts/AutopartsTable";
import { AutopartWithStock } from "@/app/types/autoparts";

export default async function PartsPage() {
  const autoparts = await db.autoparts.findMany({
    include: {
      category: true,
      brand: true,
      autos: {
        include: {
          auto: true,
        },
      },
      engineVolumes: {
        include: {
          engineVolume: true,
        },
      },
      textForSearch: true,
      warehouses: {
        include: {
          warehouse: {
            select: { id: true, name: true },
          },
        },
      },
      prices: {
        include: {
          priceType: true,
        },
        orderBy: {
          priceType: {
            name: "asc",
          },
        },
      },
      analoguesA: {
        include: {
          partB: {
            include: {
              brand: true,
              category: true,
            },
          },
        },
      },
      analoguesB: {
        include: {
          partA: {
            include: {
              brand: true,
              category: true,
            },
          },
        },
      },
    },
  });

  const brands = await db.brands.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const warehouses = await db.warehouses.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const categories = await db.categories.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const autos = await db.auto.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const engineVolumes = await db.engineVolume.findMany({
    orderBy: {
      name: "asc"
    }
  });

  const textsForSearch = await db.textForAuthopartsSearch.findMany({
    orderBy: {
      text: "asc"
    }
  });

  const formatted: AutopartWithStock[] = autoparts.map((part) => {
    const analoguesFromA = part.analoguesA.map((a) => a.partB);
    const analoguesFromB = part.analoguesB.map((a) => a.partA);
    const allAnalogues = [...analoguesFromA, ...analoguesFromB];
    // TypeScript doesn't infer year_from/year_to from include, so we use type assertion
    const partWithYears = part as typeof part & { year_from: number | null; year_to: number | null };

    return {
      id: partWithYears.id,
      article: partWithYears.article,
      description: partWithYears.description,
      maxNumberShown: partWithYears.maxNumberShown,
      year_from: partWithYears.year_from,
      year_to: partWithYears.year_to,
      category: partWithYears.category,
      brand: partWithYears.brand,
      autos: partWithYears.autos.map((a) => a.auto),
      engineVolumes: partWithYears.engineVolumes.map((ev) => ev.engineVolume),
      textForSearch: partWithYears.textForSearch,
      totalQuantity: partWithYears.warehouses.reduce((sum, w) => sum + w.quantity, 0),
      warehouses: partWithYears.warehouses.map((w) => ({
        warehouseId: w.warehouse.id,
        warehouseName: w.warehouse.name,
        quantity: w.quantity,
      })),
      prices: partWithYears.prices.map((p) => ({
        price: p.price,
        priceType: p.priceType,
      })),
      analogues: allAnalogues.map((a) => ({
        id: a.id,
        article: a.article,
        description: a.description,
        brand: a.brand,
        category: a.category,
      })),
    };
  });

  return (
    <AutopartsTable
      parts={formatted}
      brands={brands}
      categories={categories}
      autos={autos}
      engineVolumes={engineVolumes}
      warehouses={warehouses}
      textsForSearch={textsForSearch}
    />
  );
}
