import { NextResponse } from "next/server";
import db from "@/lib/db/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json([], { status: 200 });
  }

  const parts = await db.autoparts.findMany({
    where: {
      OR: [
        { article: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    include: {
      brand: true,
      category: true,
    },
  });

  console.log(parts)

  return NextResponse.json(parts);
}