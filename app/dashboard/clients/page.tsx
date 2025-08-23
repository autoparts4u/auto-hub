import db from "@/lib/db/db";
import { UsersTable } from "@/components/clients/UsersTable";

export default async function ClientsPage() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      priceAccessId: true,
      warehouseAccessId: true,
      role: true,
    },
  });

  const priceTypes = await db.priceTypes.findMany();

  const warehouses = await db.warehouses.findMany();

  return <UsersTable initialUsers={users} priceTypes={priceTypes} warehouses={warehouses} />;
}
