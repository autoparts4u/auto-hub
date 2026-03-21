import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const statuses = await prisma.purchaseStatuses.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { purchases: true } } },
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name || !body.hexColor) {
      return NextResponse.json({ error: 'name and hexColor are required' }, { status: 400 });
    }

    const status = await prisma.purchaseStatuses.create({
      data: { name: body.name, hexColor: body.hexColor, isLast: body.isLast ?? false },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
