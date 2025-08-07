// app/api/warehouses/[id]/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  const { name, address } = await req.json();

  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json(
      { error: "Все поля обязательны" },
      { status: 400 }
    );
  }

  const updated = await db.warehouses.update({
    where: { id: Number(id) },
    data: { name, address },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: number }> }
) {
  const { id } = await params;

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db.warehouses.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
