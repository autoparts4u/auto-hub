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

  // const parts = await db.autoparts.findMany({
  //   include: {
  //     brand: true,
  //     category: true,
  //     warehouses: {
  //       include: {
  //         warehouse: true,
  //       },
  //     },
  //     prices: {
  //       where: {
  //         pricesType_id: session.user.priceAccessId,
  //       },
  //     },
  //   },
  // });

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
  }
});

  const brands = await db.brands.findMany();

  const warehouses = await db.warehouses.findMany();

  return (
    <div className="p-4">
      <div className="flex justify-between">

      <h1 className="text-2xl font-bold mb-4">Доступные запчасти</h1>
      <SignOut/>
      </div>
      <AutopartsTable parts={formatted} brands={brands} warehouses={warehouses} onlyView={true} priceAccessId={user?.priceAccessId}/>
    </div>
  );
};

export default ShopPage;