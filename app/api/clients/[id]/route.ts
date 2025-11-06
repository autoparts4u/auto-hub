import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// GET /api/clients/[id] - Получить клиента по ID
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
    const client = await prisma.clients.findUnique({
      where: { id },
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
            role: true,
            isConfirmed: true,
          },
        },
        orders: {
          include: {
            orderStatus: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Обновить клиента
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

    // Проверка на уникальность email/phone если обновляются
    if (body.email) {
      const existingClient = await prisma.clients.findFirst({
        where: { 
          email: body.email,
          NOT: { id }
        },
      });
      if (existingClient) {
        return NextResponse.json(
          { error: 'Client with this email already exists' },
          { status: 400 }
        );
      }
    }

    if (body.phone) {
      const existingClient = await prisma.clients.findFirst({
        where: { 
          phone: body.phone,
          NOT: { id }
        },
      });
      if (existingClient) {
        return NextResponse.json(
          { error: 'Client with this phone already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.priceAccessId !== undefined) updateData.priceAccessId = body.priceAccessId || null;
    if (body.userId !== undefined) updateData.userId = body.userId || null;

    const client = await prisma.clients.update({
      where: { id },
      data: updateData,
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
            role: true,
            isConfirmed: true,
          },
        },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Удалить клиента
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
    // Проверяем, есть ли у клиента заказы
    const ordersCount = await prisma.orders.count({
      where: { client_id: id },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить клиента с существующими заказами' },
        { status: 400 }
      );
    }

    await prisma.clients.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

