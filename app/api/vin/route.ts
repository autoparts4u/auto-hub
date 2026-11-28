import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { decodeVin } from '@/lib/services/vinDecoder';
import { vinSchema } from '@/lib/validation/vinSchema';

/** GET /api/vin?vin=XXXXXXXXXXXXXXXXX — расшифровка VIN для подстановки в фильтры. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = vinSchema.safeParse({ vin: searchParams.get('vin') ?? '' });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Некорректный VIN' },
      { status: 400 },
    );
  }

  try {
    const decoded = await decodeVin(parsed.data.vin);
    if (!decoded) {
      return NextResponse.json({ error: 'Некорректный VIN' }, { status: 400 });
    }
    return NextResponse.json(decoded);
  } catch (error) {
    console.error('Error decoding VIN:', error);
    return NextResponse.json({ error: 'Не удалось расшифровать VIN' }, { status: 500 });
  }
}
