import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { revalidatePath } from 'next/cache';

// PATCH /api/orders/[id]/schedule
// Body: { scheduledHandoverAt: string | null, handoverNote: string | null }
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
    const body = await request.json().catch(() => ({}));

    const data: { scheduledHandoverAt?: Date | null; handoverNote?: string | null } = {};

    if ('scheduledHandoverAt' in body) {
      if (body.scheduledHandoverAt === null || body.scheduledHandoverAt === '') {
        data.scheduledHandoverAt = null;
      } else {
        const d = new Date(body.scheduledHandoverAt);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Некорректная дата выдачи' }, { status: 400 });
        }
        data.scheduledHandoverAt = d;
      }
    }

    if ('handoverNote' in body) {
      const note = body.handoverNote;
      data.handoverNote = note ? String(note).slice(0, 1000) : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    const order = await prisma.orders.update({
      where: { id },
      data,
      select: {
        id: true,
        scheduledHandoverAt: true,
        handoverNote: true,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
