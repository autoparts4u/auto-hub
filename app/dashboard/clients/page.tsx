import db from "@/lib/db/db";
import ClientsTable from "@/components/clients/ClientsTable";

export default async function ClientsPage() {
  const priceTypes = await db.priceTypes.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  return <ClientsTable priceTypes={priceTypes} />;
}
