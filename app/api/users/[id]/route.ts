// app/api/users/[id]/route.ts
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: {
    priceAccessId?: number | null;
    warehouseAccessId?: number | null;
    isConfirmed?: boolean;
    name?: string | null;
    role?: "user" | "admin";
  } = {};

  if ("priceAccessId" in body) {
    data.priceAccessId = body.priceAccessId ? Number(body.priceAccessId) : null;
  }

  if ("warehouseAccessId" in body) {
    data.warehouseAccessId = body.warehouseAccessId
      ? Number(body.warehouseAccessId)
      : null;
  }

  if ("isConfirmed" in body) {
    data.isConfirmed = Boolean(body.isConfirmed);
  }

  if ("name" in body) {
    data.name = body.name;
  }

  if ("role" in body && (body.role === "user" || body.role === "admin")) {
    data.role = body.role;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
