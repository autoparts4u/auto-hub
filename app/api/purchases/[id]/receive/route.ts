// Этот эндпоинт заменён на PUT /api/purchases/[id]/status
// Оставлен для обратной совместимости
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Используйте PUT /api/purchases/[id]/status' }, { status: 410 });
}
