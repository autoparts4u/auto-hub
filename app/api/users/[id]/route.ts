// app/api/users/[id]/route.ts
import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const userData: {
      isConfirmed?: boolean;
      email?: string;
      role?: "user" | "admin";
    } = {};

    const clientData: {
      priceAccessId?: number | null;
      warehouseAccessId?: number | null;
      name?: string;
      phone?: string | null;
      address?: string | null;
    } = {};

    // Поля для User (только auth данные)
    if ("isConfirmed" in body) {
      userData.isConfirmed = Boolean(body.isConfirmed);
    }

    if ("email" in body) {
      userData.email = body.email;
    }

    if ("role" in body && (body.role === "user" || body.role === "admin")) {
      userData.role = body.role;
    }

    // Поля для Client (бизнес данные)
    if ("priceAccessId" in body) {
      clientData.priceAccessId = body.priceAccessId ? Number(body.priceAccessId) : null;
    }

    if ("warehouseAccessId" in body) {
      clientData.warehouseAccessId = body.warehouseAccessId
        ? Number(body.warehouseAccessId)
        : null;
    }

    if ("name" in body) {
      clientData.name = body.name;
    }

    if ("phone" in body) {
      clientData.phone = body.phone || null;
    }

    if ("address" in body) {
      clientData.address = body.address || null;
    }

    if (!Object.keys(userData).length && !Object.keys(clientData).length) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    // Обновляем User и/или Client
    const updated = await db.user.update({
      where: { id },
      data: {
        ...userData,
        ...(Object.keys(clientData).length > 0 && {
          client: {
            update: clientData,
          },
        }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            fullName: true,
            phone: true,
            address: true,
            priceAccessId: true,
            warehouseAccessId: true,
            priceAccess: true,
            warehouseAccess: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Проверяем, что пользователь не удаляет сам себя
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Нельзя удалить свой собственный аккаунт' },
        { status: 400 }
      );
    }

    // Получаем пользователя с clientId
    const user = await db.user.findUnique({
      where: { id },
      select: { clientId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем, есть ли у клиента связанные заказы
    const ordersCount = user.clientId ? await db.orders.count({
      where: { 
        client_id: user.clientId
      },
    }) : 0;

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить пользователя с существующими заказами' },
        { status: 400 }
      );
    }

    // Удаляем пользователя (Client удалится автоматически из-за onDelete: Cascade)
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
