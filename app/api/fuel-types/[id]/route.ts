import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = Number(id);

  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await db.fuelType.delete({ where: { id: idNum } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка при удалении вида топлива:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении. Возможно, вид топлива используется в запчастях." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  const { name } = await req.json();

  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Название обязательно" },
      { status: 400 }
    );
  }

  try {
    const updated = await db.fuelType.update({
      where: { id: idNum },
      data: { name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Ошибка при обновлении вида топлива:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении. Возможно, такое название уже существует." },
      { status: 500 }
    );
  }
}

