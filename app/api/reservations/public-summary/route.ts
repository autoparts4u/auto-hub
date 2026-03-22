import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/reservations/public-summary
// Returns aggregated active reservation counts per autopart (all clients).
// Used by the client-facing parts table to show real available quantity.
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Expire stale reservations first
    await prisma.reservations.updateMany({
      where: { status: 'active', expiresAt: { lt: new Date() } },
      data: { status: 'expired' },
    });

    const active = await prisma.reservations.findMany({
      where: { status: 'active' },
      select: { autopart_id: true, quantity: true, expiresAt: true },
    });

    const summary: Record<string, { reservedCount: number; nearestExpiry: string | null }> = {};

    for (const r of active) {
      const id = r.autopart_id;
      if (!summary[id]) {
        summary[id] = { reservedCount: 0, nearestExpiry: null };
      }
      summary[id].reservedCount += r.quantity;
      const exp = r.expiresAt.toISOString();
      if (!summary[id].nearestExpiry || exp < summary[id].nearestExpiry!) {
        summary[id].nearestExpiry = exp;
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching reservation summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
