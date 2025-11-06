"use server";

import db  from "@/lib/db/db";
import { revalidatePath } from "next/cache";

export async function transferStock(
  partId: string,
  fromId: number,
  toId: number,
  quantity: number
) {
  await db.autopartsWarehouses.update({
    where: {
      autopart_id_warehouse_id: {
        autopart_id: partId,
        warehouse_id: fromId,
      },
    },
    data: {
      quantity: { decrement: quantity },
    },
  });

  await db.autopartsWarehouses.upsert({
    where: {
      autopart_id_warehouse_id: {
        autopart_id: partId,
        warehouse_id: toId,
      },
    },
    update: {
      quantity: { increment: quantity },
    },
    create: {
      autopart_id: partId,
      warehouse_id: toId,
      quantity,
    },
  });

  revalidatePath("/dashboard/autoparts");
}
