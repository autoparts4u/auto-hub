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

// export async function PATCH(
//   req: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const { article, description, brandId, categoryId, stock } = await req.json();

//     // Обновляем саму запчасть
//     await db.autoparts.update({
//       where: { id },
//       data: {
//         article,
//         description,
//         brand_id: brandId,
//         category_id: categoryId,
//       },
//     });

//     // Удаляем старые записи о количестве на складах
//     await db.autopartsWarehouses.deleteMany({
//       where: { authopart_id: id },
//     });

//     // Добавляем актуальные
//     await db.autopartsWarehouses.createMany({
//       data: stock.map((s: { warehouseId: number; quantity: number }) => ({
//         authopart_id: id,
//         warehouse_id: s.warehouseId,
//         quantity: s.quantity,
//       })),
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Ошибка обновления запчасти:", error);
//     return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
//   }
// }

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { article, description, brandId, categoryId, stock, analogueIds } = await req.json();

    const autopart = await db.autoparts.update({
      where: { id: params.id },
      data: {
        article,
        description,
        brand_id: brandId,
        category_id: categoryId,
        warehouses: {
          deleteMany: {},
          create: stock.map((s: { warehouseId: number; quantity: number }) => ({
            warehouseId: s.warehouseId,
            quantity: s.quantity,
          })),
        },
      },
    });

    // Обновляем аналоги: удаляем старые и добавляем новые
    await db.analogues.deleteMany({
      where: {
        OR: [{ partAId: params.id }, { partBId: params.id }],
      },
    });

    if (analogueIds?.length) {
      const analogueData = analogueIds.flatMap((id: string) => [
        { partAId: params.id, partBId: id },
        { partAId: id, partBId: params.id },
      ]);

      await db.analogues.createMany({
        data: analogueData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(autopart);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при обновлении" }, { status: 500 });
  }
}