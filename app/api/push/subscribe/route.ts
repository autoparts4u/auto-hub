import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

// POST /api/push/subscribe
// Body: { endpoint, keys: { p256dh, auth }, userAgent? }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const endpoint: string | undefined = body?.endpoint;
    const p256dh: string | undefined = body?.keys?.p256dh;
    const authKey: string | undefined = body?.keys?.auth;
    const userAgent: string | undefined = body?.userAgent;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'Некорректная подписка' }, { status: 400 });
    }

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth: authKey,
        userId: session.user.id,
        userAgent: userAgent ?? null,
      },
      update: {
        p256dh,
        auth: authKey,
        userId: session.user.id,
        userAgent: userAgent ?? null,
        lastSeenAt: new Date(),
      },
      select: { id: true, endpoint: true, createdAt: true },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    console.error('Error creating push subscription:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe?endpoint=...
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const endpoint = request.nextUrl.searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
