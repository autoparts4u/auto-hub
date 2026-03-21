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
  _count: { select: { items: true } },
};

// GET /api/purchases
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const statusId = searchParams.get('status');
    const supplierId = searchParams.get('supplier');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (statusId) where.purchaseStatus_id = parseInt(statusId);
    if (supplierId) where.supplier_id = parseInt(supplierId);
    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
        { items: { some: { article: { contains: search, mode: 'insensitive' } } } },
        { items: { some: { description: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const purchases = await prisma.purchaseOrders.findMany({
      where,
      include: purchaseInclude,
      orderBy: { orderedAt: 'desc' },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/purchases
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.supplier_id || !body.purchaseStatus_id || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'supplier_id, purchaseStatus_id and items are required' }, { status: 400 });
    }

    const newStatus = await prisma.purchaseStatuses.findUnique({ where: { id: body.purchaseStatus_id } });
    if (!newStatus) return NextResponse.json({ error: 'Status not found' }, { status: 404 });

    const autopartIds = body.items.map((i: { autopart_id: string }) => i.autopart_id).filter(Boolean);
    const autoparts = await prisma.autoparts.findMany({
      where: { id: { in: autopartIds } },
      select: { id: true, article: true, description: true },
    });
    const autopartsMap = new Map(autoparts.map((ap) => [ap.id, ap]));

    const totalAmount = body.items.reduce(
      (sum: number, item: { quantity: number; purchase_price: number }) =>
        sum + item.quantity * item.purchase_price,
      0
    );

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrders.create({
        data: {
          supplier_id: body.supplier_id,
          purchaseStatus_id: body.purchaseStatus_id,
          notes: body.notes || null,
          orderedAt: body.orderedAt ? new Date(body.orderedAt) : new Date(),
          totalAmount,
          items: {
            create: body.items.map((item: {
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

      // Если статус финальный — сразу пополняем склад
      if (newStatus.isLast) {
        for (const item of created.items) {
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
        return tx.purchaseOrders.update({
          where: { id: created.id },
          data: { receivedAt: new Date() },
          include: purchaseInclude,
        });
      }

      return created;
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
