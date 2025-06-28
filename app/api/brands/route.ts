import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const brands = await db.brands.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const created = await db.brands.create({ data: { name } });
  return NextResponse.json(created);
}
