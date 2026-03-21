import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { touchSession } from "@/lib/activity/session";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await touchSession(sessionId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
