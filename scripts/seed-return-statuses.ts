import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const statuses = [
    { id: 1, name: 'Создан', hexColor: '#6B7280', isAccepted: false },
    { id: 2, name: 'Принят', hexColor: '#16A34A', isAccepted: true },
    { id: 3, name: 'Отклонён', hexColor: '#DC2626', isAccepted: false },
  ];

  for (const status of statuses) {
    await prisma.returnStatuses.upsert({
      where: { id: status.id },
      update: { name: status.name, hexColor: status.hexColor, isAccepted: status.isAccepted },
      create: status,
    });
  }

  console.log('Return statuses seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
