import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/reservations/bulk — создать несколько резерваций за раз
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.clientId) return NextResponse.json({ error: 'No client linked' }, { status: 400 });

    const body = await request.json();
    const items: { autopartId: string; quantity: number; notes?: string }[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Нет позиций' }, { status: 400 });
    }

    const [settings, client] = await Promise.all([
      prisma.appSettings.findUnique({ where: { id: 1 } }),
      prisma.clients.findUnique({
        where: { id: session.user.clientId },
        select: { warehouseAccessId: true, reservationDurationMinutes: true },
      }),
    ]);

    const durationMinutes =
      client?.reservationDurationMinutes ?? settings?.reservationDurationMinutes ?? 1440;
    const warehouseId = client?.warehouseAccessId ?? null;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const results: { autopartId: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
      try {
        const warehouseStocks = await prisma.autopartsWarehouses.findMany({
          where: { autopart_id: item.autopartId, quantity: { gt: 0 } },
        });
        const totalStock = warehouseStocks.reduce((sum, w) => sum + w.quantity, 0);

        if (totalStock < 1) {
          results.push({ autopartId: item.autopartId, success: false, error: 'Нет в наличии' });
          continue;
        }

        const activeReservations = await prisma.reservations.aggregate({
          where: { autopart_id: item.autopartId, status: 'active' },
          _sum: { quantity: true },
        });

        const alreadyReserved = activeReservations._sum.quantity ?? 0;
        const available = totalStock - alreadyReserved;

        if (available < item.quantity) {
          results.push({
            autopartId: item.autopartId,
            success: false,
            error: `Доступно только ${available} шт.`,
          });
          continue;
        }

        await prisma.reservations.create({
          data: {
            client_id: session.user.clientId!,
            autopart_id: item.autopartId,
            quantity: item.quantity,
            notes: item.notes ?? null,
            expiresAt,
            warehouse_id: warehouseId,
          },
        });

        results.push({ autopartId: item.autopartId, success: true });
      } catch {
        results.push({ autopartId: item.autopartId, success: false, error: 'Ошибка сервера' });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ results, successCount, durationMinutes }, { status: 201 });
  } catch (error) {
    console.error('Error bulk reserving:', error);
    return NextResponse.json({ error: 'Failed to create reservations' }, { status: 500 });
  }
}
