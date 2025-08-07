import { NextResponse } from "next/server";
import db from "@/lib/db/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const analogues = await db.analogues.findMany({
      where: {
        OR: [{ partAId: id }, { partBId: id }],
      },
      include: {
        partA: true,
        partB: true,
      },
    });

    const analogueParts = Array.from(
      new Map(
        analogues
          .map((a) => (a.partAId === id ? a.partB : a.partA))
          .filter((p) => p.id !== id)
          .map((p) => [p.id, p]) // убираем дубликаты по id
      ).values()
    );

    return NextResponse.json(analogueParts);
  } catch (error) {
    console.error("Ошибка загрузки аналогов:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить аналоги" },
      { status: 500 }
    );
  }
}

// Добавить аналоги
export async function POST(req: Request, { params }: Params) {
  try {
    const { analogueIds } = await req.json();
    const { id } = await params;

    if (!Array.isArray(analogueIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await db.analogues.createMany({
      data: analogueIds.map((analougId: string) => ({
        partAId: id,
        partBId: analougId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to add analogues" },
      { status: 500 }
    );
  }
}

// Удалить аналоги
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { analogueIds } = await req.json();
    const { id } = await params;

    if (!Array.isArray(analogueIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await db.analogues.deleteMany({
      where: {
        OR: analogueIds.flatMap((analogueId: string) => [
          { partAId: id, partBId: analogueId },
          { partAId: analogueId, partBId: id },
        ]),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to remove analogues" },
      { status: 500 }
    );
  }
}
