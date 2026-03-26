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
                email: true,
                client: {
                  select: {
                    name: true,
                    fullName: true,
                  },
                },
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
    const body: UpdateOrderDTO & {
      items?: { autopart_id: string; warehouse_id: number; quantity: number; item_final_price: number }[];
    } = await request.json();

    // Проверяем существование заказа
    const existingOrder = await prisma.orders.findUnique({
      where: { id },
      include: {
        orderStatus: true,
        orderItems: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let updatedOrder;

    if (body.items) {
      // Получаем данные о запчастях для новых позиций
      const autopartIds = body.items.map((item) => item.autopart_id);
      const autoparts = await prisma.autoparts.findMany({
        where: { id: { in: autopartIds } },
        select: { id: true, article: true, description: true },
      });
      const autopartsMap = new Map(autoparts.map((ap) => [ap.id, ap]));

      // Если заказ финальный — проверяем наличие на складе для новых позиций
      // (учитываем текущие позиции, которые будут возвращены)
      if (existingOrder.orderStatus.isLast) {
        for (const item of body.items) {
          const stock = await prisma.autopartsWarehouses.findUnique({
            where: {
              autopart_id_warehouse_id: {
                autopart_id: item.autopart_id,
                warehouse_id: item.warehouse_id,
              },
            },
          });

          const existingQty = existingOrder.orderItems
            .filter(
              (oi) =>
                oi.autopart_id === item.autopart_id &&
                oi.warehouse_id === item.warehouse_id
            )
            .reduce((sum, oi) => sum + oi.quantity, 0);

          const availableQty = (stock?.quantity || 0) + existingQty;

          if (availableQty < item.quantity) {
            const autopart = autopartsMap.get(item.autopart_id);
            return NextResponse.json(
              { error: `Недостаточно товара на складе: ${autopart?.article || item.autopart_id}` },
              { status: 400 }
            );
          }
        }
      }

      // Рассчитываем новую итоговую сумму
      const discount = body.discount !== undefined ? body.discount : existingOrder.discount;
      const newTotalAmount =
        body.items.reduce(
          (sum, item) => sum + item.item_final_price * item.quantity,
          0
        ) - discount;

      // Выполняем всё в транзакции
      updatedOrder = await prisma.$transaction(async (tx) => {
        const isFinal = existingOrder.orderStatus.isLast;

        // 1. Если заказ финальный — возвращаем товары на склад для текущих позиций
        if (isFinal) {
          for (const item of existingOrder.orderItems) {
            if (item.autopart_id) {
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
        }

        // 2. Удаляем все текущие позиции заказа
        await tx.orderItems.deleteMany({ where: { order_id: id } });

        // 3. Создаём новые позиции и списываем склад (только если финальный)
        for (const item of body.items!) {
          const autopart = autopartsMap.get(item.autopart_id);
          if (!autopart) {
            throw new Error(`Autopart not found: ${item.autopart_id}`);
          }

          await tx.orderItems.create({
            data: {
              order_id: id,
              autopart_id: item.autopart_id,
              warehouse_id: item.warehouse_id,
              quantity: item.quantity,
              item_final_price: item.item_final_price,
              article: autopart.article,
              description: autopart.description,
            },
          });

          if (isFinal) {
            await tx.autopartsWarehouses.update({
              where: {
                autopart_id_warehouse_id: {
                  autopart_id: item.autopart_id,
                  warehouse_id: item.warehouse_id,
                },
              },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        }

        // 4. Обновляем заказ с пересчитанной суммой
        return tx.orders.update({
          where: { id },
          data: {
            client_id: body.client_id,
            orderStatus_id: body.orderStatus_id,
            deliveryMethod_id: body.deliveryMethod_id,
            notes: body.notes,
            deliveryAddress: body.deliveryAddress,
            trackingNumber: body.trackingNumber,
            discount,
            totalAmount: newTotalAmount,
            paidAmount: body.paidAmount,
            issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
            paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
          },
          include: {
            client: true,
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
      });
    } else {
      // Обновляем заказ без изменения позиций
      updatedOrder = await prisma.orders.update({
        where: { id },
        data: {
          client_id: body.client_id,
          orderStatus_id: body.orderStatus_id,
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
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Удалить заказ (любой статус)
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

    const order = await prisma.orders.findUnique({
      where: { id },
      include: { orderStatus: true, orderItems: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Если заказ финальный — возвращаем товары на склад перед удалением
    if (order.orderStatus.isLast) {
      for (const item of order.orderItems) {
        if (!item.autopart_id) continue;
        await prisma.autopartsWarehouses.update({
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

    await prisma.orders.delete({ where: { id } });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}

