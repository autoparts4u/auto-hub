import db from "@/lib/db/db";
import { NextResponse } from "next/server";
// import getServerSession from "next-auth";
// import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
      const { autopartId, fromWarehouseId, toWarehouseId, quantity } = await req.json();

    if (!autopartId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(fromWarehouseId, toWarehouseId)

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Warehouses must be different" },
        { status: 400 }
      );
    }

    const fromEntry = await db.autopartsWarehouses.findUnique({
      where: {
        authopart_id_warehouse_id: {
          authopart_id: autopartId,
          warehouse_id: fromWarehouseId,
        },
      },
    });

    if (!fromEntry || fromEntry.quantity < quantity) {
      return NextResponse.json(
        { error: "Недостаточно запчастей на складе-источнике" },
        { status: 400 }
      );
    }

    const [updatedFrom, updatedTo] = await db.$transaction([
      db.autopartsWarehouses.update({
        where: {
          authopart_id_warehouse_id: {
            authopart_id: autopartId,
            warehouse_id: fromWarehouseId,
          },
        },
        data: {
          quantity: { decrement: quantity },
        },
      }),

      db.autopartsWarehouses.upsert({
        where: {
          authopart_id_warehouse_id: {
            authopart_id: autopartId,
            warehouse_id: toWarehouseId,
          },
        },
        create: {
          authopart_id: autopartId,
          warehouse_id: toWarehouseId,
          quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      }),

    //   db.autopartLog.create({
    //     data: {
    //       autopartId,
    //       userId: session?.user.id ?? null,
    //       action: "moved",
    //       field: "warehouse",
    //       oldValue: JSON.stringify({ from: fromWarehouseId, quantity }),
    //       newValue: JSON.stringify({ to: toWarehouseId }),
    //     },
    //   }),
    ]);

    return NextResponse.json({ success: true, updatedFrom, updatedTo });
  } catch (error) {
    console.error("Move API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
