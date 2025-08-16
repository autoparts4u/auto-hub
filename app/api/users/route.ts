// app/api/users/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      priceAccessId: true,
      warehouseAccessId: true,
    },
  });
  return NextResponse.json(users);
}
