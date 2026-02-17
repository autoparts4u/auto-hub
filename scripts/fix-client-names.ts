/**
 * Скрипт для обновления имен клиентов
 * Используйте этот скрипт для быстрого исправления имен после миграции
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// НАСТРОЙТЕ ЗДЕСЬ: укажите правильные имена для ваших пользователей
const clientUpdates = [
  {
    email: 'admin@autohub.com',
    name: 'Администратор',
    fullName: 'Администратор системы',
    phone: '+380501234567', // укажите phone если известен
  },
  {
    email: 'ivan@example.com',
    name: 'Иван',
    fullName: 'Иван Иванович',
    phone: '+380501234568',
  },
  {
    email: 'maria@example.com',
    name: 'Мария',
    fullName: 'Мария Петровна',
    phone: '+380501234569',
  },
  {
    email: 'alex@example.com',
    name: 'Алекс',
    fullName: 'Александр Сидоров',
    phone: '+380501234570',
  },
];

async function main() {
  console.log('🔧 Обновление имен клиентов...\n');

  let updated = 0;

  for (const update of clientUpdates) {
    const user = await prisma.user.findUnique({
      where: { email: update.email },
      include: { client: true },
    });

    if (!user) {
      console.log(`⚠️  Пользователь ${update.email} не найден`);
      continue;
    }

    if (!user.clientId) {
      console.log(`⚠️  У пользователя ${update.email} нет клиента`);
      continue;
    }

    const updatedClient = await prisma.clients.update({
      where: { id: user.clientId },
      data: {
        name: update.name,
        fullName: update.fullName,
        phone: update.phone,
      },
    });

    console.log(`✅ Обновлен клиент для ${update.email}:`);
    console.log(`   ${updatedClient.name} (${updatedClient.fullName})`);
    console.log(`   Phone: ${updatedClient.phone}\n`);
    
    updated++;
  }

  console.log(`\n✨ Обновлено клиентов: ${updated}`);
}

main()
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

