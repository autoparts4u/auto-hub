import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/clients - Получить список клиентов
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.clients.findMany({
      where,
      include: {
        deliveryMethods: {
          include: {
            deliveryMethod: true,
          },
        },
        priceAccess: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Создать нового клиента
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name || !body.fullName) {
      return NextResponse.json(
        { error: 'Name and fullName are required' },
        { status: 400 }
      );
    }

    // Проверка на уникальность email/phone если указаны
    if (body.email) {
      const existingClient = await prisma.clients.findUnique({
        where: { email: body.email },
      });
      if (existingClient) {
        return NextResponse.json(
          { error: 'Client with this email already exists' },
          { status: 400 }
        );
      }
    }

    if (body.phone) {
      const existingClient = await prisma.clients.findUnique({
        where: { phone: body.phone },
      });
      if (existingClient) {
        return NextResponse.json(
          { error: 'Client with this phone already exists' },
          { status: 400 }
        );
      }
    }

    const client = await prisma.clients.create({
      data: {
        name: body.name,
        fullName: body.fullName,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        priceAccessId: body.priceAccessId || null,
      },
      include: {
        deliveryMethods: {
          include: {
            deliveryMethod: true,
          },
        },
        priceAccess: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

