import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { revalidateTag } from 'next/cache';

// POST /api/autoparts/[id]/duplicate — создать копию детали
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const original = await db.autoparts.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        fuelType: true,
        autos: { include: { auto: true } },
        engineVolumes: { include: { engineVolume: true } },
        prices: true,
        analoguesA: true,
        analoguesB: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Деталь не найдена' }, { status: 404 });
    }

    // Создаём копию без складских остатков
    const copy = await db.autoparts.create({
      data: {
        article: `Копия ${original.article}`,
        description: original.description,
        maxNumberShown: original.maxNumberShown,
        brand_id: original.brand_id,
        category_id: original.category_id,
        year_from: original.year_from,
        year_to: original.year_to,
        text_for_search_id: original.text_for_search_id,
        fuel_type_id: original.fuel_type_id,
        autos: {
          create: original.autos.map((a) => ({
            auto: { connect: { id: a.auto_id } },
          })),
        },
        engineVolumes: {
          create: original.engineVolumes.map((e) => ({
            engineVolume: { connect: { id: e.engine_volume_id } },
          })),
        },
        prices: {
          create: original.prices.map((p) => ({
            priceType: { connect: { id: p.pricesType_id } },
            price: p.price,
          })),
        },
      },
      include: {
        brand: true,
        category: true,
        fuelType: true,
        textForSearch: true,
        autos: { include: { auto: true } },
        engineVolumes: { include: { engineVolume: true } },
        prices: { include: { priceType: true } },
        warehouses: { include: { warehouse: true } },
      },
    });

    revalidateTag('autoparts');
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    console.error('Error duplicating autopart:', error);
    return NextResponse.json({ error: 'Ошибка при копировании детали' }, { status: 500 });
  }
}
