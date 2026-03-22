import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/reservations/bulk-order — создать один заказ из нескольких резерваций (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reservationIds } = await request.json();

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      return NextResponse.json({ error: 'Нет резерваций' }, { status: 400 });
    }

    const reservations = await prisma.reservations.findMany({
      where: { id: { in: reservationIds } },
      include: {
        autopart: {
          select: {
            id: true,
            article: true,
            description: true,
            prices: true,
          },
        },
        client: {
          select: { id: true, priceAccessId: true },
        },
      },
    });

    if (reservations.length === 0) {
      return NextResponse.json({ error: 'Резервации не найдены' }, { status: 404 });
    }

    const inactive = reservations.filter((r) => r.status !== 'active');
    if (inactive.length > 0) {
      return NextResponse.json({ error: 'Все резервации должны быть активными' }, { status: 400 });
    }

    const noWarehouse = reservations.filter((r) => !r.warehouse_id);
    if (noWarehouse.length > 0) {
      return NextResponse.json({ error: 'Укажите склад для всех резерваций' }, { status: 400 });
    }

    const clientIds = [...new Set(reservations.map((r) => r.client_id))];
    if (clientIds.length !== 1) {
      return NextResponse.json(
        { error: 'Все резервации должны принадлежать одному клиенту' },
        { status: 400 }
      );
    }

    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    if (!settings?.defaultOrderStatusId) {
      return NextResponse.json(
        { error: 'Не задан статус заказа по умолчанию в настройках' },
        { status: 400 }
      );
    }

    const priceAccessId = reservations[0].client.priceAccessId;

    const orderItems = reservations.map((r) => {
      const price = priceAccessId
        ? (r.autopart.prices.find((p) => p.pricesType_id === priceAccessId)?.price ?? 0)
        : (r.autopart.prices[0]?.price ?? 0);
      return {
        autopart_id: r.autopart.id,
        warehouse_id: r.warehouse_id!,
        quantity: r.quantity,
        item_final_price: price,
        article: r.autopart.article,
        description: r.autopart.description,
      };
    });

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.item_final_price * item.quantity,
      0
    );

    const order = await prisma.orders.create({
      data: {
        client_id: clientIds[0],
        orderStatus_id: settings.defaultOrderStatusId,
        deliveryMethod_id: settings.defaultDeliveryMethodId ?? null,
        totalAmount,
        orderItems: { create: orderItems },
      },
    });

    await prisma.reservations.updateMany({
      where: { id: { in: reservationIds } },
      data: { status: 'converted' },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating bulk order from reservations:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
