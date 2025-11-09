import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();

  // Обновляем phone в Client, а не в User
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { clientId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.clients.update({
    where: { id: user.clientId },
    data: { phone },
  });

  return NextResponse.json({ success: true });
}