// app/api/warehouses/[id]/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  const { name, address } = await req.json();

  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json(
      { error: "Все поля обязательны" },
      { status: 400 }
    );
  }

  const updated = await db.warehouses.update({
    where: { id },
    data: { name, address },
  });

  return NextResponse.json(updated);
}
