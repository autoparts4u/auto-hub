import db from '../lib/db/db';

async function main() {
  const [client, status, autopartWithStock, deliveryMethod] = await Promise.all([
    db.clients.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.orderStatuses.findFirst({ where: { isLast: false }, orderBy: { id: 'asc' } }),
    db.autopartsWarehouses.findFirst({
      where: { quantity: { gt: 0 } },
      include: { autopart: true, warehouse: true },
    }),
    db.deliveryMethods.findFirst({ orderBy: { id: 'asc' } }),
  ]);

  console.log(JSON.stringify(
    {
      client: client ? { id: client.id, name: client.name } : null,
      status: status ? { id: status.id, name: status.name, isLast: status.isLast } : null,
      autopart: autopartWithStock
        ? {
            id: autopartWithStock.autopart_id,
            article: autopartWithStock.autopart?.article,
            warehouse_id: autopartWithStock.warehouse_id,
            warehouse_name: autopartWithStock.warehouse?.name,
            quantity_in_stock: autopartWithStock.quantity,
          }
        : null,
      deliveryMethod: deliveryMethod ? { id: deliveryMethod.id, name: deliveryMethod.name } : null,
    },
    null,
    2
  ));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
