import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/order-statuses/[id] - Получить конкретный статус
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const status = await prisma.orderStatuses.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}

// PUT /api/order-statuses/[id] - Обновить статус
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
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.hexColor !== undefined) updateData.hexColor = body.hexColor;
    if (body.isLast !== undefined) updateData.isLast = body.isLast;

    const status = await prisma.orderStatuses.update({
      where: { id: statusId },
      data: updateData,
    });

    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('Error updating order status:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

// DELETE /api/order-statuses/[id] - Удалить статус
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
    const statusId = parseInt(id);

    if (isNaN(statusId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Проверяем, есть ли заказы с этим статусом
    const ordersWithStatus = await prisma.orders.count({
      where: { orderStatus_id: statusId },
    });

    if (ordersWithStatus > 0) {
      return NextResponse.json(
        { error: `Cannot delete status: ${ordersWithStatus} orders are using this status` },
        { status: 400 }
      );
    }

    await prisma.orderStatuses.delete({
      where: { id: statusId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting order status:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete order status' },
      { status: 500 }
    );
  }
}

