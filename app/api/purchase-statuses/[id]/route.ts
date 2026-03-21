import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const status = await prisma.purchaseStatuses.update({
      where: { id: parseInt(id) },
      data: { name: body.name, hexColor: body.hexColor, isLast: body.isLast ?? false },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const count = await prisma.purchaseOrders.count({
      where: { purchaseStatus_id: parseInt(id) },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить статус, который используется в поступлениях' },
        { status: 400 }
      );
    }

    await prisma.purchaseStatuses.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
