import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { revalidatePath } from 'next/cache';

const ALLOWED_TYPES = new Set(['order', 'purchase', 'reservation', 'return']);

// POST /api/dashboard/snooze
// Body: { entityType, entityId, hours?: number, untilIso?: string }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const entityType: string = body?.entityType;
    const entityId: string = body?.entityId;

    if (!entityType || !entityId || !ALLOWED_TYPES.has(entityType)) {
      return NextResponse.json({ error: 'Некорректные entityType/entityId' }, { status: 400 });
    }

    let snoozedUntil: Date;
    if (body?.untilIso) {
      const d = new Date(body.untilIso);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Некорректная дата untilIso' }, { status: 400 });
      }
      snoozedUntil = d;
    } else {
      const hours = Number(body?.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) {
        return NextResponse.json({ error: 'Некорректное значение hours' }, { status: 400 });
      }
      snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const result = await prisma.dashboardSnooze.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: {
        entityType,
        entityId,
        snoozedBy_userId: session.user.id,
        snoozedUntil,
      },
      update: {
        snoozedBy_userId: session.user.id,
        snoozedUntil,
      },
    });

    revalidatePath('/dashboard');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating snooze:', error);
    return NextResponse.json({ error: 'Failed to snooze' }, { status: 500 });
  }
}

// DELETE /api/dashboard/snooze?entityType=...&entityId=...
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const entityType = sp.get('entityType') ?? '';
    const entityId = sp.get('entityId') ?? '';

    if (!ALLOWED_TYPES.has(entityType) || !entityId) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    await prisma.dashboardSnooze.deleteMany({ where: { entityType, entityId } });

    revalidatePath('/dashboard');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snooze:', error);
    return NextResponse.json({ error: 'Failed to unsnooze' }, { status: 500 });
  }
}
