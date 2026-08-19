import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFullCatalog, filterCatalogForClient } from "@/lib/services/catalog";

export async function GET() {
  try {
    const session = await auth();
    const data = await getFullCatalog();
    // Скрытые детали отдаём только администратору
    const isAdmin = session?.user?.role === "admin";
    return NextResponse.json(isAdmin ? data : filterCatalogForClient(data));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 });
  }
}
