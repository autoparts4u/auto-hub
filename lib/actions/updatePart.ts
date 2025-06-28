"use server";

import db from "@/lib/db/db";
import { revalidatePath } from "next/cache";

export async function updatePart(id: string, description: string) {
  await db.autoparts.update({
    where: { id },
    data: { description },
  });

  revalidatePath("/dashboard/parts");
}
