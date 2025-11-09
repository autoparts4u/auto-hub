/**
 * Скрипт для очистки базы данных с сохранением только администратора
 * Запуск: npx tsx scripts/clean-db-keep-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Начинаем очистку базы данных...\n');

  try {
    await prisma.$transaction(async (tx) => {
      // Находим администратора
      const admin = await tx.user.findFirst({
        where: { role: 'admin' },
        include: { client: true },
      });

      if (!admin) {
        throw new Error('Администратор не найден! Отмена операции.');
      }

      console.log(`✅ Найден администратор: ${admin.email}`);
      console.log(`   Клиент: ${admin.client.name}\n`);

      // Удаляем данные (в правильном порядке из-за зависимостей)
      console.log('🗑️  Удаление данных...');

      const deleted = {
        autopartLog: await tx.autopartLog.deleteMany(),
        analogues: await tx.analogues.deleteMany(),
        orderStatusHistory: await tx.orderStatusHistory.deleteMany(),
        orderItems: await tx.orderItems.deleteMany(),
        orders: await tx.orders.deleteMany(),
        clientsDeliveryMethods: await tx.clientsDeliveryMethods.deleteMany(),
        autopartsEngineVolumes: await tx.autopartsEngineVolumes.deleteMany(),
        autopartsAutos: await tx.autopartsAutos.deleteMany(),
        autopartPrices: await tx.autopartPrices.deleteMany(),
        autopartsWarehouses: await tx.autopartsWarehouses.deleteMany(),
        autoparts: await tx.autoparts.deleteMany(),
        textForAuthopartsSearch: await tx.textForAuthopartsSearch.deleteMany(),
        engineVolume: await tx.engineVolume.deleteMany(),
        auto: await tx.auto.deleteMany(),
        categories: await tx.categories.deleteMany(),
        brands: await tx.brands.deleteMany(),
      };

      console.log('   ✓ Удалены товары и заказы');

      // Удаляем всех клиентов кроме клиента администратора
      const deletedClients = await tx.clients.deleteMany({
        where: {
          id: { not: admin.clientId },
        },
      });
      console.log(`   ✓ Удалено клиентов: ${deletedClients.count}`);

      // Удаляем всех пользователей кроме администратора
      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: { not: admin.id },
        },
      });
      console.log(`   ✓ Удалено пользователей: ${deletedUsers.count}`);

      // Удаляем справочники (опционально)
      const deletedOrderStatuses = await tx.orderStatuses.deleteMany();
      const deletedDeliveryMethods = await tx.deliveryMethods.deleteMany();
      console.log(`   ✓ Удалено статусов заказов: ${deletedOrderStatuses.count}`);
      console.log(`   ✓ Удалено методов доставки: ${deletedDeliveryMethods.count}`);

      console.log('\n📊 Статистика удаления:');
      console.log(`   - Логи запчастей: ${deleted.autopartLog.count}`);
      console.log(`   - Аналоги: ${deleted.analogues.count}`);
      console.log(`   - История статусов: ${deleted.orderStatusHistory.count}`);
      console.log(`   - Позиции заказов: ${deleted.orderItems.count}`);
      console.log(`   - Заказы: ${deleted.orders.count}`);
      console.log(`   - Связи клиенты-доставки: ${deleted.clientsDeliveryMethods.count}`);
      console.log(`   - Запчасти: ${deleted.autoparts.count}`);
      console.log(`   - Склады запчастей: ${deleted.autopartsWarehouses.count}`);
      console.log(`   - Цены запчастей: ${deleted.autopartPrices.count}`);
      console.log(`   - Бренды: ${deleted.brands.count}`);
      console.log(`   - Категории: ${deleted.categories.count}`);
      console.log(`   - Авто: ${deleted.auto.count}`);
      console.log(`   - Объемы двигателей: ${deleted.engineVolume.count}`);
      console.log(`   - Клиенты: ${deletedClients.count}`);
      console.log(`   - Пользователи: ${deletedUsers.count}`);
    });

    console.log('\n✅ База данных очищена!');
    console.log('\n👤 Осталось:');
    console.log('   - Администратор');
    console.log('   - Его клиент');
    console.log('   - Типы цен');
    console.log('   - Склады');

    // Проверяем что осталось
    const remainingUsers = await prisma.user.count();
    const remainingClients = await prisma.clients.count();
    const remainingOrders = await prisma.orders.count();
    const remainingAutoparts = await prisma.autoparts.count();

    console.log('\n📊 Проверка:');
    console.log(`   Пользователей: ${remainingUsers}`);
    console.log(`   Клиентов: ${remainingClients}`);
    console.log(`   Заказов: ${remainingOrders}`);
    console.log(`   Запчастей: ${remainingAutoparts}`);

  } catch (error) {
    console.error('\n❌ Ошибка при очистке базы данных:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

