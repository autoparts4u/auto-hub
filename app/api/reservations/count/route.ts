import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reservations/count?since=ISO - количество новых активных резерваций с заданной даты
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const since = request.nextUrl.searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(0);

    // Помечаем просроченные
    await prisma.reservations.updateMany({
      where: { status: 'active', expiresAt: { lt: new Date() } },
      data: { status: 'expired' },
    });

    const count = await prisma.reservations.count({
      where: {
        status: 'active',
        createdAt: { gt: sinceDate },
      },
    });

    // Самая свежая — для отображения в тосте
    const newest = count > 0
      ? await prisma.reservations.findFirst({
          where: { status: 'active', createdAt: { gt: sinceDate } },
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { name: true } },
            autopart: { select: { article: true } },
          },
        })
      : null;

    return NextResponse.json({
      count,
      newest: newest
        ? { client: newest.client.name, article: newest.autopart.article, quantity: newest.quantity }
        : null,
    });
  } catch (error) {
    console.error('Error counting reservations:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
