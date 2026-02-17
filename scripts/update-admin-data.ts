/**
 * Обновление данных администратора
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Обновление данных администратора...\n');

  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    include: { client: true },
  });

  if (!admin) {
    throw new Error('Администратор не найден!');
  }

  if (!admin.clientId) {
    throw new Error('У администратора нет клиента!');
  }

  // Обновляем данные клиента администратора
  const updatedClient = await prisma.clients.update({
    where: { id: admin.clientId },
    data: {
      name: 'Администратор',
      fullName: 'Администратор системы',
      phone: '+380501234567',
      address: 'г. Киев, ул. Центральная, 1',
      priceAccessId: 1, // Предполагаем что первый тип цен существует
      warehouseAccessId: 1, // Предполагаем что первый склад существует
    },
  });

  console.log('✅ Данные клиента администратора обновлены:');
  console.log(`   Имя: ${updatedClient.name}`);
  console.log(`   Полное имя: ${updatedClient.fullName}`);
  console.log(`   Телефон: ${updatedClient.phone}`);
  console.log(`   Адрес: ${updatedClient.address}`);
  console.log(`   Тип цен: ${updatedClient.priceAccessId}`);
  console.log(`   Склад: ${updatedClient.warehouseAccessId}`);

  console.log('\n✅ Готово!');
}

main()
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

