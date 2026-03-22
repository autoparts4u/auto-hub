import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/orders/my — заказы текущего пользователя (клиента)
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.clientId) return NextResponse.json([]);

    const orders = await prisma.orders.findMany({
      where: {
        client_id: session.user.clientId,
      },
      include: {
        orderStatus: { select: { id: true, name: true, hexColor: true, isLast: true } },
        orderItems: {
          select: {
            id: true,
            article: true,
            description: true,
            quantity: true,
            item_final_price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Фильтруем отменённые на стороне сервера (без Prisma, чтобы избежать stale cache)
    const active = orders.filter((o) => !o.cancelledAt);

    return NextResponse.json(active);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
