import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/delivery-methods/[id] - Получить конкретный метод доставки
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
    const methodId = parseInt(id);

    if (isNaN(methodId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const method = await prisma.deliveryMethods.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      return NextResponse.json({ error: 'Delivery method not found' }, { status: 404 });
    }

    return NextResponse.json(method);
  } catch (error) {
    console.error('Error fetching delivery method:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery method' },
      { status: 500 }
    );
  }
}

// PUT /api/delivery-methods/[id] - Обновить метод доставки
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
    const methodId = parseInt(id);

    if (isNaN(methodId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const method = await prisma.deliveryMethods.update({
      where: { id: methodId },
      data: {
        name: body.name,
        hexColor: body.hexColor,
      },
    });

    return NextResponse.json(method);
  } catch (error: unknown) {
    console.error('Error updating delivery method:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Delivery method not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update delivery method' },
      { status: 500 }
    );
  }
}

// DELETE /api/delivery-methods/[id] - Удалить метод доставки
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
    const methodId = parseInt(id);

    if (isNaN(methodId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Проверяем, есть ли заказы с этим методом доставки
    const ordersWithMethod = await prisma.orders.count({
      where: { deliveryMethod_id: methodId },
    });

    if (ordersWithMethod > 0) {
      return NextResponse.json(
        { error: `Cannot delete delivery method: ${ordersWithMethod} orders are using this method` },
        { status: 400 }
      );
    }

    await prisma.deliveryMethods.delete({
      where: { id: methodId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting delivery method:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Delivery method not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete delivery method' },
      { status: 500 }
    );
  }
}

