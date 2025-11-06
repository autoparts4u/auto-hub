import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/clients/[id]/link-user - Связать клиента с пользователем
export async function POST(
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
    const { userId, autoLink } = body;

    // Если autoLink = true, пытаемся найти пользователя по email/phone клиента
    if (autoLink) {
      const client = await prisma.clients.findUnique({
        where: { id },
      });

      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      let user = null;

      // Ищем пользователя по email
      if (client.email) {
        user = await prisma.user.findUnique({
          where: { email: client.email },
        });
      }

      // Если не нашли по email, ищем по phone
      if (!user && client.phone) {
        user = await prisma.user.findFirst({
          where: { phone: client.phone },
        });
      }

      if (!user) {
        return NextResponse.json(
          { error: 'User not found with matching email or phone' },
          { status: 404 }
        );
      }

      // Проверяем, не связан ли уже этот пользователь с другим клиентом
      const existingClient = await prisma.clients.findUnique({
        where: { userId: user.id },
      });

      if (existingClient && existingClient.id !== id) {
        return NextResponse.json(
          { error: 'This user is already linked to another client' },
          { status: 400 }
        );
      }

      // Связываем клиента с пользователем
      const updatedClient = await prisma.clients.update({
        where: { id },
        data: { userId: user.id },
        include: {
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
          priceAccess: true,
        },
      });

      return NextResponse.json(updatedClient);
    }

    // Если userId указан вручную
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required when autoLink is false' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем, не связан ли уже этот пользователь с другим клиентом
    const existingClient = await prisma.clients.findUnique({
      where: { userId },
    });

    if (existingClient && existingClient.id !== id) {
      return NextResponse.json(
        { error: 'This user is already linked to another client' },
        { status: 400 }
      );
    }

    // Связываем клиента с пользователем
    const updatedClient = await prisma.clients.update({
      where: { id },
      data: { userId },
      include: {
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
        priceAccess: true,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Error linking user to client:', error);
    return NextResponse.json(
      { error: 'Failed to link user to client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/link-user - Отвязать пользователя от клиента
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

    const updatedClient = await prisma.clients.update({
      where: { id },
      data: { userId: null },
      include: {
        priceAccess: true,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Error unlinking user from client:', error);
    return NextResponse.json(
      { error: 'Failed to unlink user from client' },
      { status: 500 }
    );
  }
}

