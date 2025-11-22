import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const fuelTypes = await db.fuelType.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(fuelTypes);
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
    }

    const created = await db.fuelType.create({ data: { name: name.trim() } });
    return NextResponse.json(created);
  } catch (error: unknown) {
    console.error("Ошибка при создании вида топлива:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Вид топлива с таким названием уже существует" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Ошибка при создании вида топлива" },
      { status: 500 }
    );
  }
}


