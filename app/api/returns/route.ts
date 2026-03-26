import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/returns — создать возврат (только admin)
// Два режима:
//   1. По заказу: { order_id, reason?, items: [{ order_item_id, quantity }] }
//   2. Произвольный: { client_id?, reason?, items: [{ article, description, quantity, warehouse_id, autopart_id? }] }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 });
    }

    const createdStatus = await prisma.returnStatuses.findFirst({
      where: { name: 'Создан' },
    });
    if (!createdStatus) {
      return NextResponse.json(
        { error: 'Статус "Создан" не найден. Запустите seed-return-statuses.' },
        { status: 500 }
      );
    }

    // --- Режим 1: возврат по заказу ---
    if (body.order_id) {
      const order = await prisma.orders.findUnique({
        where: { id: body.order_id },
        include: { orderStatus: true, orderItems: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      if (!order.orderStatus.isLast) {
        return NextResponse.json(
          { error: 'Возврат можно оформить только для завершённого заказа' },
          { status: 400 }
        );
      }
      for (const item of body.items) {
        const oi = order.orderItems.find((o) => o.id === item.order_item_id);
        if (!oi) {
          return NextResponse.json({ error: `Позиция ${item.order_item_id} не найдена` }, { status: 400 });
        }
        if (item.quantity <= 0 || item.quantity > oi.quantity) {
          return NextResponse.json(
            { error: `Недопустимое количество для ${oi.article}` },
            { status: 400 }
          );
        }
      }

      const result = await prisma.returns.create({
        data: {
          order_id: body.order_id,
          client_id: order.client_id,
          returnStatus_id: createdStatus.id,
          reason: body.reason || null,
          createdBy_userId: session.user.id,
          items: {
            create: body.items.map((item: { order_item_id: number; quantity: number }) => {
              const oi = order.orderItems.find((o) => o.id === item.order_item_id)!;
              return {
                order_item_id: item.order_item_id,
                autopart_id: oi.autopart_id,
                warehouse_id: oi.warehouse_id,
                quantity: item.quantity,
                article: oi.article,
                description: oi.description,
              };
            }),
          },
        },
        include: { returnStatus: true, items: true, client: true },
      });

      return NextResponse.json(result, { status: 201 });
    }

    // --- Режим 2: произвольный возврат ---
    for (const item of body.items) {
      if (!item.article || !item.description || !item.quantity || !item.warehouse_id) {
        return NextResponse.json(
          { error: 'Каждая позиция должна содержать article, description, quantity, warehouse_id' },
          { status: 400 }
        );
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: 'Количество должно быть больше 0' }, { status: 400 });
      }
    }

    const result = await prisma.returns.create({
      data: {
        order_id: null,
        client_id: body.client_id || null,
        returnStatus_id: createdStatus.id,
        reason: body.reason || null,
        createdBy_userId: session.user.id,
        items: {
          create: body.items.map((item: {
            article: string;
            description: string;
            quantity: number;
            warehouse_id: number;
            autopart_id?: string;
          }) => ({
            order_item_id: null,
            autopart_id: item.autopart_id || null,
            warehouse_id: item.warehouse_id,
            quantity: item.quantity,
            article: item.article,
            description: item.description,
          })),
        },
      },
      include: { returnStatus: true, items: true, client: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating return:', error);
    return NextResponse.json({ error: 'Failed to create return' }, { status: 500 });
  }
}

// GET /api/returns
//   ?order_id=xxx   — возвраты по заказу (admin или владелец заказа)
//   без параметров   — все возвраты (только admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    // Запрос по конкретному заказу — могут делать и клиенты
    if (order_id) {
      if (session.user.role !== 'admin') {
        const order = await prisma.orders.findUnique({
          where: { id: order_id },
          include: { client: { include: { user: true } } },
        });
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        if (order.client?.user?.id !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const returns = await prisma.returns.findMany({
        where: { order_id },
        include: { returnStatus: true, items: true, client: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(returns);
    }

    // Все возвраты — только admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    if (statusFilter && statusFilter !== 'all') {
      where.returnStatus_id = parseInt(statusFilter);
    }
    if (search) {
      where.OR = [
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { fullName: { contains: search, mode: 'insensitive' } } },
        { items: { some: { article: { contains: search, mode: 'insensitive' } } } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const returns = await prisma.returns.findMany({
      where,
      include: {
        returnStatus: true,
        items: true,
        client: true,
        order: { select: { id: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error('Error fetching returns:', error);
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
  }
}
