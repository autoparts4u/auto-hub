import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

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

// GET /api/purchases/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const purchase = await prisma.purchaseOrders.findUnique({ where: { id }, include: purchaseInclude });
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(purchase);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/purchases/[id]
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
    const body = await request.json();

    const existing = await prisma.purchaseOrders.findUnique({
      where: { id },
      include: { purchaseStatus: true, items: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (existing.purchaseStatus.isLast) {
      return NextResponse.json({ error: 'Нельзя редактировать финальное поступление' }, { status: 400 });
    }

    const autopartIds = (body.items ?? []).map((i: { autopart_id: string }) => i.autopart_id).filter(Boolean);
    const autoparts = await prisma.autoparts.findMany({
      where: { id: { in: autopartIds } },
      select: { id: true, article: true, description: true },
    });
    const autopartsMap = new Map(autoparts.map((ap) => [ap.id, ap]));

    const totalAmount = (body.items ?? []).reduce(
      (sum: number, item: { quantity: number; purchase_price: number }) =>
        sum + item.quantity * item.purchase_price,
      0
    );

    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItems.deleteMany({ where: { purchaseOrder_id: id } });

      return tx.purchaseOrders.update({
        where: { id },
        data: {
          supplier_id: body.supplier_id,
          purchaseStatus_id: body.purchaseStatus_id,
          notes: body.notes || null,
          orderedAt: body.orderedAt ? new Date(body.orderedAt) : undefined,
          totalAmount,
          items: {
            create: (body.items ?? []).map((item: {
              autopart_id: string;
              warehouse_id: number;
              quantity: number;
              purchase_price: number;
            }) => {
              const autopart = autopartsMap.get(item.autopart_id);
              return {
                autopart_id: item.autopart_id || null,
                warehouse_id: item.warehouse_id,
                quantity: item.quantity,
                purchase_price: item.purchase_price,
                article: autopart?.article || '',
                description: autopart?.description || '',
              };
            }),
          },
        },
        include: purchaseInclude,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/purchases/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const purchase = await prisma.purchaseOrders.findUnique({
      where: { id },
      include: { purchaseStatus: true, items: true },
    });
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Если статус финальный — откатываем склад
      if (purchase.purchaseStatus.isLast) {
        for (const item of purchase.items) {
          if (!item.autopart_id) continue;
          await tx.autopartsWarehouses.update({
            where: { autopart_id_warehouse_id: { autopart_id: item.autopart_id, warehouse_id: item.warehouse_id } },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }
      await tx.purchaseOrders.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
