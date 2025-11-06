import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { UpdateOrderDTO } from '@/app/types/orders';

// GET /api/orders/[id] - Получить детали заказа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.orders.findUnique({
      where: { id },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        deliveryMethod: true,
        orderStatus: true,
        orderItems: {
          include: {
            autopart: {
              select: {
                id: true,
                article: true,
                description: true,
                brand: {
                  select: { name: true },
                },
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        statusHistory: {
          include: {
            orderStatus: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Обновить заказ
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
    const body: UpdateOrderDTO = await request.json();

    // Проверяем существование заказа
    const existingOrder = await prisma.orders.findUnique({
      where: { id },
      include: { orderStatus: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Обновляем заказ
    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: {
        client_id: body.client_id,
        deliveryMethod_id: body.deliveryMethod_id,
        notes: body.notes,
        deliveryAddress: body.deliveryAddress,
        trackingNumber: body.trackingNumber,
        discount: body.discount,
        totalAmount: body.totalAmount,
        paidAmount: body.paidAmount,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
        paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
      },
      include: {
        client: true,
        user: { select: { id: true, name: true, email: true } },
        deliveryMethod: true,
        orderStatus: true,
        orderItems: {
          include: {
            autopart: {
              select: {
                id: true,
                article: true,
                description: true,
                brand: { select: { name: true } },
              },
            },
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Удалить заказ (только для новых заказов)
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

    // Проверяем заказ
    const order = await prisma.orders.findUnique({
      where: { id },
      include: {
        orderStatus: true,
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Проверяем, можно ли удалить заказ (только если статус "Новый" или "Отменен")
    if (!order.orderStatus.isLast && order.orderStatus.name !== 'Новый') {
      return NextResponse.json(
        { error: 'Нельзя удалить заказ в обработке' },
        { status: 400 }
      );
    }

    // Удаляем заказ в транзакции, возвращая товары на склад
    await prisma.$transaction(async (tx) => {
      // Возвращаем товары на склад
      for (const item of order.orderItems) {
        if (item.autopart_id) {
          await tx.autopartsWarehouses.update({
            where: {
              autopart_id_warehouse_id: {
                autopart_id: item.autopart_id,
                warehouse_id: item.warehouse_id,
              },
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // Удаляем заказ (каскадно удалятся orderItems и statusHistory)
      await tx.orders.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}

