import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { revalidatePath } from 'next/cache';

// POST /api/orders/[id]/items/[itemId]/pick
// Body: { picked: boolean }  — toggle pickedAt / pickedBy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, itemId } = await params;
    const itemIdNum = Number(itemId);
    if (!Number.isFinite(itemIdNum)) {
      return NextResponse.json({ error: 'Некорректный itemId' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const picked: boolean = Boolean(body?.picked);

    const item = await prisma.orderItems.findUnique({
      where: { id: itemIdNum },
      select: { id: true, order_id: true },
    });
    if (!item || item.order_id !== id) {
      return NextResponse.json({ error: 'Позиция не найдена в заказе' }, { status: 404 });
    }

    const updated = await prisma.orderItems.update({
      where: { id: itemIdNum },
      data: picked
        ? { pickedAt: new Date(), pickedBy_userId: session.user.id }
        : { pickedAt: null, pickedBy_userId: null },
      select: {
        id: true,
        pickedAt: true,
        pickedBy_userId: true,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error toggling item pick:', error);
    return NextResponse.json({ error: 'Failed to toggle pick' }, { status: 500 });
  }
}
