import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const logs = await db.autopartLog.findMany({
      where: {
        autopartId: id,
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