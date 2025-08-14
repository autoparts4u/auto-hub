// app/shop/page.tsx
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { AutopartsTable } from "@/components/autoparts/AutopartsTable";
import { SignOut } from "@/components/sign-out";
import { redirect } from "next/navigation";

const ShopPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { priceAccessId: true },
  });

  const autoparts = await db.autoparts.findMany({
    include: {
      category: true,
      brand: true,
      auto: true,
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
          priceType: {
            select: { id: true, name: true },
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

  const brands = await db.brands.findMany();

  const warehouses = await db.warehouses.findMany();

  const categories = await db.categories.findMany();

  const autos = await db.auto.findMany();

  const textsForSearch = await db.textForAuthopartsSearch.findMany();

  const formatted = autoparts.map((part) => {
    const analoguesFromA = part.analoguesA.map((a) => a.partB);
    const analoguesFromB = part.analoguesB.map((a) => a.partA);
    const allAnalogues = [...analoguesFromA, ...analoguesFromB];
    return {
      id: part.id,
      article: part.article,
      description: part.description,
      brand: part.brand,
      category: part.category,
      auto: part.auto,
      textForSearch: part.textForSearch,
      totalQuantity: part.warehouses.reduce((acc, w) => acc + w.quantity, 0),
      warehouses: part.warehouses.map((w) => ({
        warehouseId: w.warehouse.id,
        warehouseName: w.warehouse.name,
        quantity: w.quantity,
      })),
      prices: part.prices.map((p) => ({
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
    <div className="p-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold mb-4">Доступные запчасти</h1>
        <SignOut />
      </div>
      <AutopartsTable
        parts={formatted}
        brands={brands}
        warehouses={warehouses}
        categories={categories}
        autos={autos}
        textsForSearch={textsForSearch}
        onlyView={true}
        priceAccessId={user?.priceAccessId}
      />
    </div>
  );
};

export default ShopPage;
