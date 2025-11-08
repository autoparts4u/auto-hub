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

    const data: {
      priceAccessId?: number | null;
      warehouseAccessId?: number | null;
      isConfirmed?: boolean;
      name?: string | null;
      phone?: string | null;
      address?: string | null;
      email?: string;
      role?: "user" | "admin";
    } = {};

    if ("priceAccessId" in body) {
      data.priceAccessId = body.priceAccessId ? Number(body.priceAccessId) : null;
    }

    if ("warehouseAccessId" in body) {
      data.warehouseAccessId = body.warehouseAccessId
        ? Number(body.warehouseAccessId)
        : null;
    }

    if ("isConfirmed" in body) {
      data.isConfirmed = Boolean(body.isConfirmed);
    }

    if ("name" in body) {
      data.name = body.name;
    }

    if ("phone" in body) {
      data.phone = body.phone || null;
    }

    if ("address" in body) {
      data.address = body.address || null;
    }

    if ("email" in body) {
      data.email = body.email;
    }

    if ("role" in body && (body.role === "user" || body.role === "admin")) {
      data.role = body.role;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data,
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

    // Проверяем, есть ли у пользователя связанные заказы
    const ordersCount = await db.orders.count({
      where: { 
        client: {
          userId: id
        }
      },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить пользователя с существующими заказами' },
        { status: 400 }
      );
    }

    // Удаляем пользователя
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
