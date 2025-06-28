// app/dashboard/parts/page.tsx
import db from "@/lib/db/db";
import { AutopartsTable } from "@/components/autoparts/AutopartsTable";
import { AutopartWithStock } from "@/app/types/autoparts";

export default async function PartsPage() {
  const autoparts = await db.autoparts.findMany({
    include: {
      category: true,
      brand: true,
      warehouses: {
        include: {
          warehouse: {
            select: { id: true, name: true },
          },
        },
      },
      prices: {
        include: {
          priceType: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const brands = await db.brands.findMany();

  const warehouses = await db.warehouses.findMany();

  const formatted: AutopartWithStock[] = autoparts.map((part) => ({
    id: part.id,
    article: part.article,
    description: part.description,
    category: part.category,
    brand: part.brand,
    totalQuantity: part.warehouses.reduce((sum, w) => sum + w.quantity, 0),
    warehouses: part.warehouses.map((w) => ({
      warehouseId: w.warehouse.id,
      warehouseName: w.warehouse.name,
      quantity: w.quantity,
    })),
    prices: part.prices.map((p) => ({
      price: p.price,
      priceType: p.priceType,
    })),
  }));

  return <AutopartsTable parts={formatted} brands={brands} warehouses={warehouses} />;
}