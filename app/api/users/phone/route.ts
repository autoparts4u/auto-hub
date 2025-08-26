import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();

  await db.user.update({
    where: { id: session.user.id },
    data: { phone },
  });

  return NextResponse.json({ success: true });
}