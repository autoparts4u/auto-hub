import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/delivery-methods - Получить список способов доставки
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    let deliveryMethods;

    if (clientId) {
      // Получаем методы доставки для конкретного клиента
      const clientMethods = await prisma.clientsDeliveryMethods.findMany({
        where: { client_id: clientId },
        include: {
          deliveryMethod: true,
        },
      });

      deliveryMethods = clientMethods.map(cm => cm.deliveryMethod);
    } else {
      // Получаем все методы доставки
      deliveryMethods = await prisma.deliveryMethods.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    }

    return NextResponse.json(deliveryMethods);
  } catch (error) {
    console.error('Error fetching delivery methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery methods' },
      { status: 500 }
    );
  }
}

// POST /api/delivery-methods - Создать новый способ доставки
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const deliveryMethod = await prisma.deliveryMethods.create({
      data: {
        name: body.name,
        hexColor: body.hexColor,
      },
    });

    return NextResponse.json(deliveryMethod, { status: 201 });
  } catch (error) {
    console.error('Error creating delivery method:', error);
    return NextResponse.json(
      { error: 'Failed to create delivery method' },
      { status: 500 }
    );
  }
}

