import { NextResponse } from "next/server";
import { getFullCatalog } from "@/lib/services/catalog";

export async function GET() {
  try {
    const data = await getFullCatalog();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 });
  }
}
