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
    const {
      article,
      description,
      brandId,
      categoryId,
      autoId,
      textForSearchId,
      stock,
      analogueIds,
    } = await req.json();

    console.log(textForSearchId)

    const autopart = await db.autoparts.update({
      where: { id },
      data: {
        article,
        description,
        brand_id: brandId,
        category_id: categoryId,
        auto_id: autoId,
        text_for_search_id: textForSearchId || null,
        warehouses: {
          deleteMany: {},
          create: stock.map((s: { warehouseId: number; quantity: number }) => ({
            warehouse: { connect: { id: s.warehouseId } },
            quantity: s.quantity,
          })),
        },
      },
    });

    // Обновляем аналоги: удаляем старые и добавляем новые
    await db.analogues.deleteMany({
      where: {
        OR: [{ partAId: id }, { partBId: id }],
      },
    });

    if (analogueIds?.length) {
      const analogueData = analogueIds.flatMap((analougeId: string) => [
        { partAId: id, partBId: analougeId },
        { partAId: analougeId, partBId: id },
      ]);

      await db.analogues.createMany({
        data: analogueData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(autopart);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Ошибка при обновлении" },
      { status: 500 }
    );
  }
}
