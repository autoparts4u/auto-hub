import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import db from '@/lib/db/db';

/**
 * POST /api/users/[id]/link-client
 * Связать пользователя с существующим клиентом
 * 
 * Body: { clientId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли клиент
    const client = await db.clients.findUnique({
      where: { id: clientId },
      include: {
        user: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Проверяем, не связан ли клиент уже с другим пользователем
    if (client.user && client.user.id !== userId) {
      return NextResponse.json(
        { error: 'Client is already linked to another user' },
        { status: 400 }
      );
    }

    // Получаем текущего пользователя
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Если у пользователя уже есть клиент, нужно решить что с ним делать
    if (currentUser.client) {
      // Проверяем, есть ли заказы у старого клиента
      const oldClientOrders = await db.orders.count({
        where: { client_id: currentUser.clientId },
      });

      if (oldClientOrders > 0) {
        return NextResponse.json(
          { 
            error: 'User already has a client with orders. Cannot change client link.',
            currentClient: currentUser.client,
            ordersCount: oldClientOrders,
          },
          { status: 400 }
        );
      }

      // Если заказов нет, можем удалить старого клиента
      await db.clients.delete({
        where: { id: currentUser.clientId },
      });
    }

    // Связываем пользователя с новым клиентом
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { clientId: clientId },
      include: {
        client: {
          include: {
            priceAccess: true,
            warehouseAccess: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'User successfully linked to client',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error linking user to client:', error);
    return NextResponse.json(
      { error: 'Failed to link user to client' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]/link-client
 * Отвязать пользователя от клиента (создать нового пустого клиента)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли заказы у текущего клиента
    const ordersCount = await db.orders.count({
      where: { client_id: user.clientId },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot unlink client with existing orders',
          ordersCount,
        },
        { status: 400 }
      );
    }

    // Создаем нового пустого клиента
    const newClient = await db.clients.create({
      data: {
        name: 'Клиент',
        fullName: user.email,
        phone: null,
        address: null,
      },
    });

    // Связываем пользователя с новым клиентом
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { clientId: newClient.id },
      include: {
        client: true,
      },
    });

    // Удаляем старого клиента
    await db.clients.delete({
      where: { id: user.clientId },
    });

    return NextResponse.json({
      message: 'User unlinked from client',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error unlinking user from client:', error);
    return NextResponse.json(
      { error: 'Failed to unlink user from client' },
      { status: 500 }
    );
  }
}

