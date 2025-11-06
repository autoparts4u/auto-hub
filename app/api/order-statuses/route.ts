import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/order-statuses - Получить список статусов заказов
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statuses = await prisma.orderStatuses.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching order statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order statuses' },
      { status: 500 }
    );
  }
}

// POST /api/order-statuses - Создать новый статус
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name || !body.hexColor) {
      return NextResponse.json(
        { error: 'Name and hexColor are required' },
        { status: 400 }
      );
    }

    const status = await prisma.orderStatuses.create({
      data: {
        name: body.name,
        hexColor: body.hexColor,
        isLast: body.isLast || false,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error('Error creating order status:', error);
    return NextResponse.json(
      { error: 'Failed to create order status' },
      { status: 500 }
    );
  }
}

