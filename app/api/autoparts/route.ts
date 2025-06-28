import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { article, description, brandId, categoryId, stock } = await req.json();

  if (!article || !description || !brandId || !categoryId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const created = await db.autoparts.create({
    data: {
      article,
      description,
      brand_id: brandId,
      category_id: categoryId,
      warehouses: {
        create: stock.map(
          ({
            warehouseId,
            quantity,
          }: {
            warehouseId: number;
            quantity: number;
          }) => ({
            warehouse: { connect: { id: Number(warehouseId) } },
            quantity,
          })
        ),
      },
    },
  });


  return NextResponse.json(created);
}
