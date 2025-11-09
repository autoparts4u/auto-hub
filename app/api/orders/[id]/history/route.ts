import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/orders/[id]/history - Получить историю статусов заказа
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

    // Проверяем существование заказа
    const order = await prisma.orders.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Получаем историю статусов
    const history = await prisma.orderStatusHistory.findMany({
      where: { order_id: id },
      include: {
        orderStatus: true,
        user: {
          select: {
            id: true,
            email: true,
            client: {
              select: {
                name: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order history' },
      { status: 500 }
    );
  }
}

