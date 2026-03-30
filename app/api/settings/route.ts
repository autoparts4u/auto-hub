import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.appSettings.findUnique({
      where: { id: 1 },
      select: {
        defaultOrderStatusId: true,
        defaultDeliveryMethodId: true,
        defaultPurchaseStatusId: true,
        usdRateOffset: true,
        reservationDurationMinutes: true,
        tickerText: true,
      },
    });
    return NextResponse.json(settings ?? { defaultOrderStatusId: null, defaultDeliveryMethodId: null, defaultPurchaseStatusId: null, usdRateOffset: 0, reservationDurationMinutes: 1440, tickerText: null });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {
        defaultOrderStatus: body.defaultOrderStatusId
          ? { connect: { id: body.defaultOrderStatusId } }
          : { disconnect: true },
        defaultDeliveryMethod: body.defaultDeliveryMethodId
          ? { connect: { id: body.defaultDeliveryMethodId } }
          : { disconnect: true },
        defaultPurchaseStatus: body.defaultPurchaseStatusId
          ? { connect: { id: body.defaultPurchaseStatusId } }
          : { disconnect: true },
        usdRateOffset: body.usdRateOffset ?? 0,
        reservationDurationMinutes: body.reservationDurationMinutes ?? 1440,
        tickerText: body.tickerText ?? null,
      },
      create: {
        id: 1,
        defaultOrderStatus: body.defaultOrderStatusId
          ? { connect: { id: body.defaultOrderStatusId } }
          : undefined,
        defaultDeliveryMethod: body.defaultDeliveryMethodId
          ? { connect: { id: body.defaultDeliveryMethodId } }
          : undefined,
        defaultPurchaseStatus: body.defaultPurchaseStatusId
          ? { connect: { id: body.defaultPurchaseStatusId } }
          : undefined,
        usdRateOffset: body.usdRateOffset ?? 0,
        reservationDurationMinutes: body.reservationDurationMinutes ?? 1440,
        tickerText: body.tickerText ?? null,
      },
      select: {
        defaultOrderStatusId: true,
        defaultDeliveryMethodId: true,
        defaultPurchaseStatusId: true,
        usdRateOffset: true,
        reservationDurationMinutes: true,
        tickerText: true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
