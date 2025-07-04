// app/api/autoparts/[id]/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await db.autoparts.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Ошибка удаления:", e);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { article, description, brandId, categoryId, stock } = await req.json();

    // Обновляем саму запчасть
    await db.autoparts.update({
      where: { id },
      data: {
        article,
        description,
        brand_id: brandId,
        category_id: categoryId,
      },
    });

    // Удаляем старые записи о количестве на складах
    await db.autopartsWarehouses.deleteMany({
      where: { authopart_id: id },
    });

    // Добавляем актуальные
    await db.autopartsWarehouses.createMany({
      data: stock.map((s: { warehouseId: number; quantity: number }) => ({
        authopart_id: id,
        warehouse_id: s.warehouseId,
        quantity: s.quantity,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обновления запчасти:", error);
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}
