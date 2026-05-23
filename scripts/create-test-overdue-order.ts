import db from '../lib/db/db';

// Создаёт один тестовый заказ с просроченной выдачей
// (scheduledHandoverAt = вчера 14:00) для проверки push-уведомлений.
// Заказ помечен в notes как тестовый — легко найти/удалить.

const TEST_MARKER = '[TEST PUSH NOTIFICATION]';

async function main() {
  const [client, status, autopartWithStock] = await Promise.all([
    db.clients.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.orderStatuses.findFirst({ where: { isLast: false }, orderBy: { id: 'asc' } }),
    db.autopartsWarehouses.findFirst({
      where: { quantity: { gt: 0 } },
      include: {
        autopart: { select: { id: true, article: true, description: true } },
        warehouse: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!client) throw new Error('No clients in DB');
  if (!status) throw new Error('No non-final order status');
  if (!autopartWithStock || !autopartWithStock.autopart) throw new Error('No autopart with stock');

  // Вчера, 14:00 (локальное время сервера)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(14, 0, 0, 0);

  const itemPrice = 1000;
  const quantity = 1;
  const totalAmount = itemPrice * quantity;

  const order = await db.$transaction(async (tx) => {
    const created = await tx.orders.create({
      data: {
        client_id: client.id,
        orderStatus_id: status.id,
        totalAmount,
        discount: 0,
        notes: `${TEST_MARKER} Можно удалить.`,
        scheduledHandoverAt: yesterday,
        handoverNote: 'Тестовый заказ для проверки уведомлений',
      },
    });

    await tx.orderItems.create({
      data: {
        order_id: created.id,
        autopart_id: autopartWithStock.autopart!.id,
        warehouse_id: autopartWithStock.warehouse_id,
        quantity,
        item_final_price: itemPrice,
        article: autopartWithStock.autopart!.article,
        description: autopartWithStock.autopart!.description,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        order_id: created.id,
        orderStatus_id: status.id,
        userId: null,
        comment: TEST_MARKER,
      },
    });

    return created;
  });

  console.log('');
  console.log('✅ Test order created:');
  console.log('   id:                  ' + order.id);
  console.log('   client:              ' + client.name);
  console.log('   status:              ' + status.name);
  console.log('   scheduledHandoverAt: ' + yesterday.toISOString() + '  ← вчера, попадёт в handoverOverdue');
  console.log('   notes:               ' + order.notes);
  console.log('');
  console.log('Чтобы удалить:');
  console.log("   npx tsx -e \"import('./lib/db/db').then(m=>m.default.orders.delete({where:{id:'" + order.id + "'}})).then(()=>console.log('deleted'))\"");
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
