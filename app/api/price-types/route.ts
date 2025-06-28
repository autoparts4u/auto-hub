import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Название обязательно" },
      { status: 400 }
    );
  }

  const created = await db.priceTypes.create({ data: { name } });
  return NextResponse.json(created);
}
