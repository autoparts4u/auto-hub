import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/reservations/[id]/cancel — мягкая отмена резервации
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const reservation = await prisma.reservations.findUnique({ where: { id } });
    if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = session.user.role === 'admin';
    const isOwner = reservation.client_id === session.user.clientId;
    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (reservation.status !== 'active') return NextResponse.json({ error: 'Резервация уже неактивна' }, { status: 400 });

    await prisma.reservations.update({ where: { id }, data: { status: 'cancelled' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 });
  }
}
