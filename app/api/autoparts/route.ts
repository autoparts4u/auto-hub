import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const autoparts = await db.autoparts.findMany({
      include: {
        brand: true,
        category: true,
        warehouses: {
          include: {
            warehouse: true,
          },
        },
        prices: {
          include: {
            priceType: true,
          },
        },
      },
      orderBy: {
        article: 'asc',
      },
    });

    return NextResponse.json(autoparts);
  } catch (error) {
    console.error('Error fetching autoparts:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении запчастей' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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
      stock,
      analogueIds,
    } = await req.json();

    const autopart = await db.autoparts.create({
      data: {
        article,
        description,
        maxNumberShown,
        brand_id: brandId,
        category_id: categoryId,
        year_from: yearFrom || null,
        year_to: yearTo || null,
        text_for_search_id: textForSearchId || null,
        warehouses: {
          create: stock.map((s: { warehouseId: number; quantity: number }) => ({
            warehouseId: s.warehouseId,
            quantity: s.quantity,
          })),
        },
        autos: {
          create: autoIds.map((autoId: number) => ({
            auto: { connect: { id: autoId } },
          })),
        },
        engineVolumes: {
          create: engineVolumeIds.map((engineVolumeId: number) => ({
            engineVolume: { connect: { id: engineVolumeId } },
          })),
        },
      },
    });

    if (analogueIds?.length) {
      const analogueData = analogueIds.flatMap((id: string) => [
        { partAId: autopart.id, partBId: id },
        { partAId: id, partBId: autopart.id },
      ]);

      await db.analogues.createMany({
        data: analogueData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(autopart, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при создании" }, { status: 500 });
  }
}
