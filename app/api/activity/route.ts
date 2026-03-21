import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity/session";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { sessionId, type, payload } = await req.json();
    if (!sessionId || !type) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await logActivity(sessionId, session.user.id, type, payload);
    return NextResponse.json({ ok: true });
  } catch {
    // Всегда 200 — клиент не должен знать о сбоях логирования
    return NextResponse.json({ ok: false });
  }
}
