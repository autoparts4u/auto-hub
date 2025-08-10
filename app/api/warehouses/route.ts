import db from "@/lib/db/db";
import { NextResponse, NextRequest } from "next/server";

// Получить все склады
export async function GET() {
  try {
    const warehouses = await db.warehouses.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Ошибка при получении баз:", error);
    return NextResponse.json(
      { error: "Ошибка при получении баз" },
      { status: 500 }
    );
  }
}

// Создать новый склад
export async function POST(req: NextRequest) {
  try {
    const { name, address } = await req.json();

    if (!name?.trim() || !address?.trim()) {
      return NextResponse.json(
        { error: "Название и адрес обязательны" },
        { status: 400 }
      );
    }

    const created = await db.warehouses.create({
      data: { name: name.trim(), address: address.trim() },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error("Ошибка при создании базы:", error);
    return NextResponse.json(
      { error: "Ошибка при создании базы" },
      { status: 500 }
    );
  }
}
