// app/api/autoparts/[id]/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await db.autoparts.delete({
      where: { id },
    });

    revalidateTag("autoparts");
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
      maxNumberShown,
      brandId,
      categoryId,
      autoIds,
      engineVolumeIds,
      yearFrom,
      yearTo,
      textForSearchId,
      fuelTypeId,
      stock,
      analogueIds,
    } = await req.json();

    const existing = await db.autoparts.findFirst({ where: { id }, select: { id: true } });
    if (!existing) {
      revalidateTag("autoparts"); // сбрасываем кэш, чтобы таблица не показывала несуществующие записи
      return NextResponse.json({ error: "Деталь не найдена или была удалена" }, { status: 404 });
    }

    // PrismaNeon не поддерживает интерактивные транзакции и вложенные create внутри update,
    // поэтому выполняем последовательно: сначала удаляем старые связи, затем обновляем основную запись, затем создаём новые связи.
    await db.autopartsWarehouses.deleteMany({ where: { autopart_id: id } });
    await db.autopartsAutos.deleteMany({ where: { autopart_id: id } });
    await db.autopartsEngineVolumes.deleteMany({ where: { autopart_id: id } });

    const autopart = await db.autoparts.update({
      where: { id },
      data: {
        article,
        description,
        maxNumberShown,
        brand_id: brandId,
        category_id: categoryId,
        year_from: yearFrom || null,
        year_to: yearTo || null,
        text_for_search_id: textForSearchId || null,
        fuel_type_id: fuelTypeId || null,
      },
    });

    if (stock?.length) {
      await db.autopartsWarehouses.createMany({
        data: stock.map((s: { warehouseId: number; quantity: number }) => ({
          autopart_id: id,
          warehouse_id: s.warehouseId,
          quantity: s.quantity,
        })),
      });
    }

    if (autoIds?.length) {
      await db.autopartsAutos.createMany({
        data: autoIds.map((autoId: number) => ({
          autopart_id: id,
          auto_id: autoId,
        })),
      });
    }

    if (engineVolumeIds?.length) {
      await db.autopartsEngineVolumes.createMany({
        data: engineVolumeIds.map((engineVolumeId: number) => ({
          autopart_id: id,
          engine_volume_id: engineVolumeId,
        })),
      });
    }

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

    revalidateTag("autoparts");
    revalidatePath("/shop");
    return NextResponse.json(autopart);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Ошибка при обновлении" },
      { status: 500 }
    );
  }
}
