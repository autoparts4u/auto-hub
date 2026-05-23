import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";

// GET /api/autoparts/search?q=...&full=1
// Лёгкий серверный поиск для форм (заказ/поступление). Возвращает топ-25.
// full=1 — включает warehouses + prices (нужно OrderModal для авто-склада и авто-цены).
export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const full = searchParams.get("full") === "1";

  if (!query) {
    return NextResponse.json([], { status: 200 });
  }

  const parts = await db.autoparts.findMany({
    where: {
      OR: [
        { article: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 25,
    orderBy: { article: "asc" },
    include: full
      ? {
          brand: true,
          warehouses: { include: { warehouse: true } },
          prices: { include: { priceType: true } },
        }
      : {
          brand: true,
          category: true,
        },
  });

  return NextResponse.json(parts);
}
