import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';
import { CreateOrderDTO } from '@/app/types/orders';

// GET /api/orders - Получить список заказов
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const client = searchParams.get('client');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const unpaidIssued = searchParams.get('unpaidIssued') === 'true';

    // Построение фильтров
    const where: Record<string, unknown> = {};

    if (status) {
      where.orderStatus_id = parseInt(status);
    }

    if (client) {
      where.client_id = client;
    }

    // Фильтр для неоплаченных выданных заказов
    if (unpaidIssued) {
      where.issuedAt = { not: null };
      where.paidAt = null; // Заказы без полной оплаты
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) {
        createdAtFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        createdAtFilter.lte = new Date(dateTo);
      }
      where.createdAt = createdAtFilter;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let orders = await prisma.orders.findMany({
      where,
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
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Дополнительная фильтрация для частичной оплаты
    if (unpaidIssued) {
      orders = orders.filter(order => {
        if (!order.totalAmount) return false;
        const finalAmount = order.totalAmount - order.discount;
        return order.paidAmount < finalAmount;
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Создать новый заказ
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateOrderDTO = await request.json();

    // Валидация
    if (!body.client_id || !body.orderStatus_id || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Получаем данные о запчастях для сохранения артикула и описания
    const autopartIds = body.items.map(item => item.autopart_id);
    const autoparts = await prisma.autoparts.findMany({
      where: { id: { in: autopartIds } },
      select: {
        id: true,
        article: true,
        description: true,
      },
    });

    const autopartsMap = new Map(autoparts.map((ap) => [ap.id, ap]));

    // Проверяем наличие на складе
    for (const item of body.items) {
      const stock = await prisma.autopartsWarehouses.findUnique({
        where: {
          autopart_id_warehouse_id: {
            autopart_id: item.autopart_id,
            warehouse_id: item.warehouse_id,
          },
        },
      });

      if (!stock || stock.quantity < item.quantity) {
        const autopart = autopartsMap.get(item.autopart_id);
        return NextResponse.json(
          {
            error: `Недостаточно товара на складе: ${autopart?.article || item.autopart_id}`,
          },
          { status: 400 }
        );
      }
    }

    // Рассчитываем общую сумму
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.item_final_price * item.quantity,
      0
    ) - (body.discount || 0);

    // Создаем заказ с позициями в транзакции
    const order = await prisma.$transaction(async (tx) => {
      // Создаем заказ
      const newOrder = await tx.orders.create({
        data: {
          client_id: body.client_id,
          deliveryMethod_id: body.deliveryMethod_id,
          orderStatus_id: body.orderStatus_id,
          totalAmount,
          discount: body.discount || 0,
          notes: body.notes,
          deliveryAddress: body.deliveryAddress,
        },
        include: {
          client: true,
          deliveryMethod: true,
          orderStatus: true,
        },
      });

      // Создаем позиции заказа
      for (const item of body.items) {
        const autopart = autopartsMap.get(item.autopart_id);
        if (!autopart) {
          throw new Error(`Autopart not found: ${item.autopart_id}`);
        }

        await tx.orderItems.create({
          data: {
            order_id: newOrder.id,
            autopart_id: item.autopart_id,
            warehouse_id: item.warehouse_id,
            quantity: item.quantity,
            item_final_price: item.item_final_price,
            article: autopart.article,
            description: autopart.description,
          },
        });

        // Уменьшаем количество на складе
        await tx.autopartsWarehouses.update({
          where: {
            autopart_id_warehouse_id: {
              autopart_id: item.autopart_id,
              warehouse_id: item.warehouse_id,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Создаем первую запись истории статусов
      await tx.orderStatusHistory.create({
        data: {
          order_id: newOrder.id,
          orderStatus_id: body.orderStatus_id,
          userId: session.user.id,
          comment: 'Заказ создан',
        },
      });

      return newOrder;
    });

    // Получаем полный заказ с позициями
    const fullOrder = await prisma.orders.findUnique({
      where: { id: order.id },
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

    return NextResponse.json(fullOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

