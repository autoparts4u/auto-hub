import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: number }> }
) {
  const { id} = await params;

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db.categories.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Название обязательно" },
      { status: 400 }
    );
  }

  const updated = await db.categories.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json(updated);
}
