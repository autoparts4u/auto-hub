import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

// Получить все цены по автозапчасти
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const prices = await db.autopartPrices.findMany({
    where: {
      authopart_id: id,
    },
    include: {
      priceType: true,
    },
  });

  const allPriceTypes = await db.priceTypes.findMany();

  // Возвращаем все типы цен, даже если цена не установлена
  const merged = allPriceTypes.map((type) => {
    const found = prices.find((p) => p.pricesType_id === type.id);
    return {
      priceTypeId: type.id,
      priceTypeName: type.name,
      price: found?.price ?? null,
    };
  });

  return NextResponse.json(merged);
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = await Promise.resolve(context); // ✅ костыль для обхода предупреждения
  const id = params.id;

  const prices: { priceTypeId: number; price: number }[] = await req.json();
console.log(prices)
  try {
    const validPrices = prices.filter(
      (p) =>
        typeof p.priceTypeId === "number" &&
        typeof p.price === "number" &&
        !isNaN(p.price)
    );

    if (validPrices.length === 0) {
      return NextResponse.json(
        { error: "Нет валидных цен для обновления" },
        { status: 400 }
      );
    }

    const transactions = validPrices.map((p) =>
      db.autopartPrices.upsert({
        where: {
          authopart_id_pricesType_id: {
            authopart_id: id,
            pricesType_id: p.priceTypeId,
          },
        },
        update: {
          price: p.price,
        },
        create: {
          authopart_id: id,
          pricesType_id: p.priceTypeId,
          price: p.price,
        },
      })
    );

    await db.$transaction(transactions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка при обновлении цен:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении цен" },
      { status: 500 }
    );
  }
}
