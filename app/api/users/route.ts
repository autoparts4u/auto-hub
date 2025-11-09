// app/api/users/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isConfirmed: true,
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
          fullName: true,
          phone: true,
          address: true,
          priceAccessId: true,
          warehouseAccessId: true,
          priceAccess: true,
          warehouseAccess: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return NextResponse.json(users);
}
