import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// DELETE /api/reservations/[id] — удаление резервации (любой статус)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const reservation = await prisma.reservations.findUnique({ where: { id } });
    if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.reservations.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 });
  }
}

// PATCH /api/reservations/[id] — назначить склад (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { warehouseId } = await request.json();

    if (!warehouseId) return NextResponse.json({ error: 'warehouseId required' }, { status: 400 });

    const reservation = await prisma.reservations.update({
      where: { id },
      data: { warehouse_id: warehouseId },
      include: {
        warehouse: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error assigning warehouse:', error);
    return NextResponse.json({ error: 'Failed to assign warehouse' }, { status: 500 });
  }
}

// POST /api/reservations/[id]/convert — создать заказ из резервации (admin)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const reservation = await prisma.reservations.findUnique({
      where: { id },
      include: {
        autopart: {
          select: {
            id: true, article: true, description: true,
            prices: { include: { priceType: true }, take: 1 },
          },
        },
      },
    });

    if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (reservation.status !== 'active') return NextResponse.json({ error: 'Резервация неактивна' }, { status: 400 });
    if (!reservation.warehouse_id) return NextResponse.json({ error: 'Сначала укажите склад для резервации' }, { status: 400 });

    // Получаем дефолтный статус заказа
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const orderStatusId = settings?.defaultOrderStatusId;

    if (!orderStatusId) {
      return NextResponse.json({ error: 'Не задан статус заказа по умолчанию в настройках' }, { status: 400 });
    }

    const price = reservation.autopart.prices[0]?.price ?? 0;

    const order = await prisma.orders.create({
      data: {
        client_id: reservation.client_id,
        orderStatus_id: orderStatusId,
        deliveryMethod_id: settings?.defaultDeliveryMethodId ?? null,
        notes: reservation.notes ?? undefined,
        totalAmount: price * reservation.quantity,
        orderItems: {
          create: {
            autopart_id: reservation.autopart.id,
            warehouse_id: reservation.warehouse_id,
            quantity: reservation.quantity,
            item_final_price: price,
            article: reservation.autopart.article,
            description: reservation.autopart.description,
          },
        },
      },
    });

    await prisma.reservations.update({ where: { id }, data: { status: 'converted' } });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error('Error converting reservation:', error);
    return NextResponse.json({ error: 'Failed to convert reservation' }, { status: 500 });
  }
}
