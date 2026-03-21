import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const [user, sessions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    }),
    db.userActivitySession.findMany({
      where: { userId },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { events: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user, sessions });
}
