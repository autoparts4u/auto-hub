import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { UpdateOrderStatusDTO } from '@/app/types/orders';
import { revalidateTag } from 'next/cache';

// PUT /api/orders/[id]/status - Изменить статус заказа
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
    const body: UpdateOrderStatusDTO = await request.json();

    if (!body.orderStatus_id) {
      return NextResponse.json(
        { error: 'orderStatus_id is required' },
        { status: 400 }
      );
    }

    // Проверяем существование заказа
    const order = await prisma.orders.findUnique({
      where: { id },
      include: { orderStatus: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Проверяем, не является ли текущий статус финальным
    if (order.orderStatus.isLast) {
      return NextResponse.json(
        { error: 'Нельзя изменить статус завершенного заказа' },
        { status: 400 }
      );
    }

    // Проверяем существование нового статуса
    const newStatus = await prisma.orderStatuses.findUnique({
      where: { id: body.orderStatus_id },
    });

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Status not found' },
        { status: 404 }
      );
    }

    // Если новый статус финальный — проверяем наличие товаров на складе
    if (newStatus.isLast) {
      const orderWithItems = await prisma.orders.findUnique({
        where: { id },
        include: { orderItems: true },
      });

      for (const item of orderWithItems?.orderItems ?? []) {
        if (!item.autopart_id) continue;
        const stock = await prisma.autopartsWarehouses.findUnique({
          where: {
            autopart_id_warehouse_id: {
              autopart_id: item.autopart_id,
              warehouse_id: item.warehouse_id,
            },
          },
        });
        if (!stock || stock.quantity < item.quantity) {
          return NextResponse.json(
            { error: `Недостаточно товара на складе: ${item.article}` },
            { status: 400 }
          );
        }
      }
    }

    // Обновляем статус и создаем запись в истории в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем заказ
      const updatedOrder = await tx.orders.update({
        where: { id },
        data: {
          orderStatus_id: body.orderStatus_id,
          // Автоматически устанавливаем issuedAt при статусе "Готов к выдаче" или "Выдан"
          issuedAt: newStatus.name === 'Готов к выдаче' || newStatus.name === 'Выдан'
            ? order.issuedAt || new Date()
            : order.issuedAt,
          // Автоматически устанавливаем paidAt при статусе "Оплачен"
          paidAt: newStatus.name === 'Оплачен'
            ? order.paidAt || new Date()
            : order.paidAt,
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

      // Если статус финальный — списываем склад
      if (newStatus.isLast) {
        for (const item of updatedOrder.orderItems) {
          if (!item.autopart_id) continue;
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

      // Создаем запись в истории
      await tx.orderStatusHistory.create({
        data: {
          order_id: id,
          orderStatus_id: body.orderStatus_id,
          userId: session.user.id,
          comment: body.comment || `Статус изменен на "${newStatus.name}"`,
        },
      });

      return updatedOrder;
    });

    revalidateTag("autoparts");
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

