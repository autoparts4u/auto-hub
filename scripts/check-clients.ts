/**
 * Скрипт для проверки данных в таблицах User и Clients
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Проверка данных...\n');

  // Проверяем всех пользователей
  const users = await prisma.user.findMany({
    include: {
      client: true,
    },
  });

  console.log(`📊 Найдено пользователей: ${users.length}\n`);

  for (const user of users) {
    console.log(`User: ${user.email}`);
    console.log(`  Client ID: ${user.clientId || 'нет'}`);
    console.log(`  Client Name: ${user.client?.name || 'нет'}`);
    console.log(`  Client FullName: ${user.client?.fullName || 'нет'}`);
    console.log(`  Client Phone: ${user.client?.phone || 'нет'}`);
    console.log('');
  }

  // Проверяем всех клиентов
  const allClients = await prisma.clients.findMany({
    include: {
      user: {
        select: {
          email: true,
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  console.log(`\n📊 Всего клиентов в базе: ${allClients.length}\n`);

  for (const client of allClients) {
    console.log(`Client: ${client.name} (${client.fullName})`);
    console.log(`  ID: ${client.id}`);
    console.log(`  Phone: ${client.phone || 'нет'}`);
    console.log(`  User: ${client.user?.email || 'НЕ АВТОРИЗОВАН'}`);
    console.log(`  Orders: ${client._count.orders}`);
    console.log('');
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

