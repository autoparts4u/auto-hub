import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// Помечаем просроченные резервации как expired
async function expireOldReservations() {
  await prisma.reservations.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });
}

// GET /api/reservations
// Admin: все резервации. User: только свои (по clientId)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await expireOldReservations();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const isAdmin = session.user.role === 'admin';

    const where: Record<string, unknown> = {};

    if (!isAdmin) {
      // Обычный пользователь видит только свои резервации
      if (!session.user.clientId) {
        return NextResponse.json([]);
      }
      where.client_id = session.user.clientId;
    }

    if (status) {
      where.status = status;
    }

    const reservations = await prisma.reservations.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        autopart: { select: { id: true, article: true, description: true, brand: { select: { name: true } } } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

// POST /api/reservations — создать резервацию (пользователь)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.clientId) {
      return NextResponse.json({ error: 'No client linked to user' }, { status: 400 });
    }

    const body = await request.json();
    const { autopartId, quantity, notes } = body;

    if (!autopartId || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Получаем настройки (длительность резервации)
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const durationMinutes = settings?.reservationDurationMinutes ?? 1440;

    // Считаем общий остаток по всем складам
    const warehouseStocks = await prisma.autopartsWarehouses.findMany({
      where: { autopart_id: autopartId, quantity: { gt: 0 } },
    });

    const totalStock = warehouseStocks.reduce((sum, w) => sum + w.quantity, 0);

    if (totalStock < 1) {
      return NextResponse.json({ error: 'Товар отсутствует в наличии' }, { status: 400 });
    }

    // Считаем уже зарезервированное количество по всем складам
    const activeReservations = await prisma.reservations.aggregate({
      where: { autopart_id: autopartId, status: 'active' },
      _sum: { quantity: true },
    });

    const alreadyReserved = activeReservations._sum.quantity ?? 0;
    const available = totalStock - alreadyReserved;

    if (available < quantity) {
      return NextResponse.json({
        error: `Недостаточно товара. Доступно для резерва: ${available}`,
      }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const reservation = await prisma.reservations.create({
      data: {
        client_id: session.user.clientId,
        autopart_id: autopartId,
        quantity,
        notes: notes ?? null,
        expiresAt,
      },
      include: {
        autopart: { select: { article: true, description: true } },
        warehouse: { select: { name: true } },
      },
    });

    return NextResponse.json({ reservation, durationMinutes }, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
