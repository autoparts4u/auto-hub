import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const statuses = await prisma.returnStatuses.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json(statuses);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch return statuses' }, { status: 500 });
  }
}
