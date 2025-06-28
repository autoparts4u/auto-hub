// app/api/autoparts/[id]/logs/route.ts
import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const logs = await db.autopartLog.findMany({
      where: {
        autopartId: params.id,
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Ошибка при получении логов:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}