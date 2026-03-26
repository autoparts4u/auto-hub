import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// PUT /api/returns/[id]/status — сменить статус возврата (только admin)
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
    const body: { returnStatus_id: number; adminComment?: string } = await request.json();

    if (!body.returnStatus_id) {
      return NextResponse.json({ error: 'returnStatus_id is required' }, { status: 400 });
    }

    // Находим возврат
    const existingReturn = await prisma.returns.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    // Блокируем если уже разрешён
    if (existingReturn.resolvedAt !== null) {
      return NextResponse.json(
        { error: 'Возврат уже обработан и не может быть изменён' },
        { status: 400 }
      );
    }

    // Находим новый статус
    const newStatus = await prisma.returnStatuses.findUnique({
      where: { id: body.returnStatus_id },
    });

    if (!newStatus) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Если статус "Принят" — возвращаем товары на склад
      if (newStatus.isAccepted) {
        for (const item of existingReturn.items) {
          if (!item.autopart_id) continue;
          await tx.autopartsWarehouses.update({
            where: {
              autopart_id_warehouse_id: {
                autopart_id: item.autopart_id,
                warehouse_id: item.warehouse_id,
              },
            },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      const updatedReturn = await tx.returns.update({
        where: { id },
        data: {
          returnStatus_id: body.returnStatus_id,
          adminComment: body.adminComment || null,
          resolvedAt: new Date(),
        },
        include: {
          returnStatus: true,
          items: true,
        },
      });

      return updatedReturn;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating return status:', error);
    return NextResponse.json({ error: 'Failed to update return status' }, { status: 500 });
  }
}
