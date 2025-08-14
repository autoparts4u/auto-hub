import db from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  const textsForSearch = await db.textForAuthopartsSearch.findMany({
    orderBy: { text: "asc" },
  });

  return NextResponse.json(textsForSearch);
}

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "Текст обязательно" }, { status: 400 });
  }

  const created = await db.textForAuthopartsSearch.create({ data: { text } });
  return NextResponse.json(created);
}
