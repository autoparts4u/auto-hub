// app/api/users/[id]/route.ts
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { priceAccessId } = await req.json();

  if (!priceAccessId || isNaN(priceAccessId)) {
    return NextResponse.json(
      { error: "Invalid priceAccessId" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id },
    data: { priceAccessId: Number(priceAccessId) },
  });

  return NextResponse.json(updated);
}
