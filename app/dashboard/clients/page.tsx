import db from "@/lib/db/db";
import { UsersTable } from "@/components/clients/UsersTable";

export default async function ClientsPage() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      priceAccessId: true,
      role: true,
    },
  });

  const priceTypes = await db.priceTypes.findMany();

  return <UsersTable initialUsers={users} priceTypes={priceTypes} />;
}
