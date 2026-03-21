import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stock } = await req.json() as { stock: { warehouseId: number; quantity: number }[] };

    if (!Array.isArray(stock)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await db.autopartsWarehouses.deleteMany({ where: { autopart_id: id } });

    const positive = stock.filter(s => s.quantity > 0);
    if (positive.length > 0) {
      await db.autopartsWarehouses.createMany({
        data: positive.map(s => ({
          autopart_id: id,
          warehouse_id: s.warehouseId,
          quantity: s.quantity,
        })),
      });
    }

    revalidateTag("autoparts");
    revalidatePath("/shop");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка обновления остатков" }, { status: 500 });
  }
}
