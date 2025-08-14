import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const autos = await db.auto.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(autos);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const created = await db.auto.create({ data: { name } });
  return NextResponse.json(created);
}
