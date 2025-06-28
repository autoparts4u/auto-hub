import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await db.categories.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const created = await db.categories.create({ data: { name } });
  return NextResponse.json(created);
}
