import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { revalidateTag } from 'next/cache';

const purchaseInclude = {
  supplier: true,
  purchaseStatus: true,
  items: {
    include: {
      autopart: { select: { id: true, article: true, description: true, brand: { select: { name: true } } } },
      warehouse: { select: { id: true, name: true } },
    },
  },
};

// PUT /api/purchases/[id]/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { purchaseStatus_id } = await request.json();

    if (!purchaseStatus_id) {
      return NextResponse.json({ error: 'purchaseStatus_id is required' }, { status: 400 });
    }

    const purchase = await prisma.purchaseOrders.findUnique({
      where: { id },
      include: { purchaseStatus: true, items: true },
    });
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (purchase.purchaseStatus.isLast) {
      return NextResponse.json({ error: 'Нельзя изменить статус финального поступления' }, { status: 400 });
    }

    const newStatus = await prisma.purchaseStatuses.findUnique({ where: { id: purchaseStatus_id } });
    if (!newStatus) return NextResponse.json({ error: 'Status not found' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrders.update({
        where: { id },
        data: {
          purchaseStatus_id,
          receivedAt: newStatus.isLast ? new Date() : purchase.receivedAt,
        },
        include: purchaseInclude,
      });

      // Если новый статус финальный — пополняем склад
      if (newStatus.isLast) {
        for (const item of purchase.items) {
          if (!item.autopart_id) continue;
          const existing = await tx.autopartsWarehouses.findUnique({
            where: { autopart_id_warehouse_id: { autopart_id: item.autopart_id, warehouse_id: item.warehouse_id } },
          });
          if (existing) {
            await tx.autopartsWarehouses.update({
              where: { autopart_id_warehouse_id: { autopart_id: item.autopart_id, warehouse_id: item.warehouse_id } },
              data: { quantity: { increment: item.quantity } },
            });
          } else {
            await tx.autopartsWarehouses.create({
              data: { autopart_id: item.autopart_id, warehouse_id: item.warehouse_id, quantity: item.quantity },
            });
          }
        }
      }

      return updated;
    });

    revalidateTag("autoparts");
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
