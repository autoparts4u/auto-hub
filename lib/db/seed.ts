import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Очистка базы данных
  console.log('🗑️  Очистка базы данных...');
  await prisma.autopartLog.deleteMany();
  await prisma.analogues.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItems.deleteMany();
  await prisma.orders.deleteMany();
  await prisma.orderStatuses.deleteMany();
  await prisma.clientsDeliveryMethods.deleteMany();
  await prisma.clients.deleteMany();
  await prisma.deliveryMethods.deleteMany();
  await prisma.autopartsEngineVolumes.deleteMany();
  await prisma.autopartsAutos.deleteMany();
  await prisma.autopartPrices.deleteMany();
  await prisma.autopartsWarehouses.deleteMany();
  await prisma.autoparts.deleteMany();
  await prisma.textForAuthopartsSearch.deleteMany();
  await prisma.engineVolume.deleteMany();
  await prisma.auto.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.brands.deleteMany();
  await prisma.user.deleteMany();
  await prisma.priceTypes.deleteMany();
  await prisma.warehouses.deleteMany();
  console.log('✅ База данных очищена');

  // 1. Создание типов цен
  console.log('📊 Создание типов цен...');
  const priceTypes = await Promise.all([
    prisma.priceTypes.create({ data: { name: 'Розничная' } }),
    prisma.priceTypes.create({ data: { name: 'Оптовая' } }),
    prisma.priceTypes.create({ data: { name: 'VIP' } }),
    prisma.priceTypes.create({ data: { name: 'Дилерская' } }),
  ]);
  console.log(`✅ Создано ${priceTypes.length} типов цен`);

  // 2. Создание складов
  console.log('🏢 Создание складов...');
  const warehouses = await Promise.all([
    prisma.warehouses.create({
      data: { name: 'Основной склад', address: 'ул. Промышленная, 10' },
    }),
    prisma.warehouses.create({
      data: { name: 'Склад №2', address: 'пр. Ленина, 45' },
    }),
    prisma.warehouses.create({
      data: { name: 'Склад №3', address: 'ул. Складская, 7' },
    }),
  ]);
  console.log(`✅ Создано ${warehouses.length} складов`);

  // 3. Создание пользователей
  console.log('👥 Создание пользователей...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      name: 'Администратор',
      email: 'admin@autohub.com',
      password: hashedPassword,
      role: Role.admin,
      isConfirmed: true,
      phone: '+380501234567',
      address: 'г. Киев, ул. Центральная, 1',
      priceAccessId: priceTypes[0].id,
      warehouseAccessId: warehouses[0].id,
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Иван Петров',
        email: 'ivan@example.com',
        password: hashedPassword,
        role: Role.user,
        isConfirmed: true,
        phone: '+380501234568',
        address: 'г. Киев, ул. Садовая, 12',
        priceAccessId: priceTypes[0].id,
        warehouseAccessId: warehouses[0].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Мария Сидорова',
        email: 'maria@example.com',
        password: hashedPassword,
        role: Role.user,
        isConfirmed: true,
        phone: '+380501234569',
        address: 'г. Харьков, пр. Победы, 33',
        priceAccessId: priceTypes[1].id,
        warehouseAccessId: warehouses[1].id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Алексей Козлов',
        email: 'alex@example.com',
        password: hashedPassword,
        role: Role.user,
        isConfirmed: true,
        phone: '+380501234570',
        priceAccessId: priceTypes[2].id,
      },
    }),
  ]);
  console.log(`✅ Создано ${users.length + 1} пользователей (включая администратора)`);

  // 4. Создание брендов
  console.log('🏷️ Создание брендов...');
  const brands = await Promise.all([
    prisma.brands.create({ data: { name: 'Bosch' } }),
    prisma.brands.create({ data: { name: 'Mann' } }),
    prisma.brands.create({ data: { name: 'Brembo' } }),
    prisma.brands.create({ data: { name: 'Sachs' } }),
    prisma.brands.create({ data: { name: 'Hengst' } }),
    prisma.brands.create({ data: { name: 'NGK' } }),
    prisma.brands.create({ data: { name: 'Valeo' } }),
    prisma.brands.create({ data: { name: 'Denso' } }),
    prisma.brands.create({ data: { name: 'Mahle' } }),
    prisma.brands.create({ data: { name: 'SKF' } }),
  ]);
  console.log(`✅ Создано ${brands.length} брендов`);

  // 5. Создание категорий
  console.log('📁 Создание категорий...');
  const categories = await Promise.all([
    prisma.categories.create({ data: { name: 'Фильтры' } }),
    prisma.categories.create({ data: { name: 'Тормозная система' } }),
    prisma.categories.create({ data: { name: 'Подвеска' } }),
    prisma.categories.create({ data: { name: 'Двигатель' } }),
    prisma.categories.create({ data: { name: 'Электрика' } }),
    prisma.categories.create({ data: { name: 'Трансмиссия' } }),
    prisma.categories.create({ data: { name: 'Выхлопная система' } }),
    prisma.categories.create({ data: { name: 'Кузов' } }),
  ]);
  console.log(`✅ Создано ${categories.length} категорий`);

  // 6. Создание автомобилей
  console.log('🚗 Создание автомобилей...');
  const autos = await Promise.all([
    prisma.auto.create({ data: { name: 'BMW E39' } }),
    prisma.auto.create({ data: { name: 'Mercedes W210' } }),
    prisma.auto.create({ data: { name: 'Audi A4 B5' } }),
    prisma.auto.create({ data: { name: 'Volkswagen Passat B5' } }),
    prisma.auto.create({ data: { name: 'Toyota Camry V40' } }),
    prisma.auto.create({ data: { name: 'Honda Accord VII' } }),
    prisma.auto.create({ data: { name: 'Ford Focus II' } }),
    prisma.auto.create({ data: { name: 'Opel Astra G' } }),
  ]);
  console.log(`✅ Создано ${autos.length} автомобилей`);

  // 6.5. Создание объемов двигателей
  console.log('⚙️ Создание объемов двигателей...');
  const engineVolumes = await Promise.all([
    prisma.engineVolume.create({ data: { name: '1.6' } }),
    prisma.engineVolume.create({ data: { name: '1.8' } }),
    prisma.engineVolume.create({ data: { name: '2.0' } }),
    prisma.engineVolume.create({ data: { name: '2.2' } }),
    prisma.engineVolume.create({ data: { name: '2.4' } }),
    prisma.engineVolume.create({ data: { name: '2.5' } }),
    prisma.engineVolume.create({ data: { name: '2.8' } }),
    prisma.engineVolume.create({ data: { name: '3.0' } }),
    prisma.engineVolume.create({ data: { name: '3.5' } }),
    prisma.engineVolume.create({ data: { name: '4.0' } }),
  ]);
  console.log(`✅ Создано ${engineVolumes.length} объемов двигателей`);

  // 7. Создание текстов для поиска
  console.log('🔍 Создание текстов для поиска...');
  const searchTexts = await Promise.all([
    prisma.textForAuthopartsSearch.create({ data: { text: 'масляный фильтр двигателя' } }),
    prisma.textForAuthopartsSearch.create({ data: { text: 'воздушный фильтр' } }),
    prisma.textForAuthopartsSearch.create({ data: { text: 'тормозные колодки передние' } }),
    prisma.textForAuthopartsSearch.create({ data: { text: 'тормозные диски' } }),
    prisma.textForAuthopartsSearch.create({ data: { text: 'амортизатор передний' } }),
    prisma.textForAuthopartsSearch.create({ data: { text: 'свечи зажигания' } }),
  ]);
  console.log(`✅ Создано ${searchTexts.length} текстов для поиска`);

  // 8. Создание автозапчастей
  console.log('🔧 Создание автозапчастей...');
  const autopartsList = [
    {
      article: '0451103316',
      description: 'Масляный фильтр Bosch',
      brand_id: brands[0].id, // Bosch
      category_id: categories[0].id, // Фильтры
      text_for_search_id: searchTexts[0].id,
      year_from: 1995,
      year_to: 2010,
    },
    {
      article: 'W712/73',
      description: 'Масляный фильтр Mann',
      brand_id: brands[1].id, // Mann
      category_id: categories[0].id,
      text_for_search_id: searchTexts[0].id,
      year_from: 1998,
      year_to: 2015,
    },
    {
      article: 'C27011',
      description: 'Воздушный фильтр Mann',
      brand_id: brands[1].id,
      category_id: categories[0].id,
      text_for_search_id: searchTexts[1].id,
      year_from: 2000,
      year_to: 2018,
    },
    {
      article: 'P85020',
      description: 'Тормозные колодки передние Brembo',
      brand_id: brands[2].id, // Brembo
      category_id: categories[1].id, // Тормозная система
      text_for_search_id: searchTexts[2].id,
      year_from: 1995,
      year_to: 2005,
    },
    {
      article: '09.9772.11',
      description: 'Тормозные диски передние Brembo',
      brand_id: brands[2].id,
      category_id: categories[1].id,
      text_for_search_id: searchTexts[3].id,
      year_from: 1996,
      year_to: 2008,
    },
    {
      article: '311844',
      description: 'Амортизатор передний Sachs',
      brand_id: brands[3].id, // Sachs
      category_id: categories[2].id, // Подвеска
      text_for_search_id: searchTexts[4].id,
      year_from: 1995,
      year_to: 2005,
    },
    {
      article: '313455',
      description: 'Амортизатор передний Sachs (усиленный)',
      brand_id: brands[3].id,
      category_id: categories[2].id,
      text_for_search_id: searchTexts[4].id,
      year_from: 2000,
      year_to: 2010,
    },
    {
      article: 'E149001',
      description: 'Фильтр топливный Hengst',
      brand_id: brands[4].id, // Hengst
      category_id: categories[0].id,
      text_for_search_id: searchTexts[0].id,
      year_from: 1997,
      year_to: 2012,
    },
    {
      article: 'BKR6E-11',
      description: 'Свечи зажигания NGK',
      brand_id: brands[5].id, // NGK
      category_id: categories[4].id, // Электрика
      text_for_search_id: searchTexts[5].id,
      year_from: 2002,
      year_to: 2020,
    },
    {
      article: '585107',
      description: 'Комплект сцепления Valeo',
      brand_id: brands[6].id, // Valeo
      category_id: categories[5].id, // Трансмиссия
      year_from: 1998,
      year_to: 2008,
    },
    {
      article: '267500-1470',
      description: 'Стартер Denso',
      brand_id: brands[7].id, // Denso
      category_id: categories[4].id,
      year_from: 2000,
      year_to: 2015,
    },
    {
      article: 'LX1004',
      description: 'Воздушный фильтр Mahle',
      brand_id: brands[8].id, // Mahle
      category_id: categories[0].id,
      text_for_search_id: searchTexts[1].id,
      year_from: 2003,
      year_to: 2018,
    },
    {
      article: '6203-2RSH',
      description: 'Подшипник ступицы SKF',
      brand_id: brands[9].id, // SKF
      category_id: categories[2].id,
      year_from: 1995,
      year_to: 2012,
    },
    {
      article: 'OC264',
      description: 'Масляный фильтр Mahle',
      brand_id: brands[8].id,
      category_id: categories[0].id,
      text_for_search_id: searchTexts[0].id,
      year_from: 2005,
      year_to: 2020,
    },
    {
      article: '09.A419.11',
      description: 'Тормозные диски задние Brembo',
      brand_id: brands[2].id,
      category_id: categories[1].id,
      text_for_search_id: searchTexts[3].id,
      year_from: 1996,
      year_to: 2008,
    },
  ];

  const autoparts = [];
  for (const autopartData of autopartsList) {
    const autopart = await prisma.autoparts.create({
      data: autopartData,
    });
    autoparts.push(autopart);
  }
  console.log(`✅ Создано ${autoparts.length} автозапчастей`);

  // 9. Создание связей запчастей с автомобилями
  console.log('🔗 Создание связей запчастей с автомобилями...');
  const autopartsAutosData = [
    // Масляный фильтр Bosch подходит для BMW, Mercedes, Audi
    { autopart_id: autoparts[0].id, auto_id: autos[0].id },
    { autopart_id: autoparts[0].id, auto_id: autos[1].id },
    { autopart_id: autoparts[0].id, auto_id: autos[2].id },
    // Масляный фильтр Mann для VW, Audi
    { autopart_id: autoparts[1].id, auto_id: autos[2].id },
    { autopart_id: autoparts[1].id, auto_id: autos[3].id },
    // Воздушный фильтр Mann для VW, Audi
    { autopart_id: autoparts[2].id, auto_id: autos[2].id },
    { autopart_id: autoparts[2].id, auto_id: autos[3].id },
    // Тормозные колодки Brembo для BMW, Mercedes
    { autopart_id: autoparts[3].id, auto_id: autos[0].id },
    { autopart_id: autoparts[3].id, auto_id: autos[1].id },
    // Тормозные диски для BMW, Mercedes, Audi
    { autopart_id: autoparts[4].id, auto_id: autos[0].id },
    { autopart_id: autoparts[4].id, auto_id: autos[1].id },
    { autopart_id: autoparts[4].id, auto_id: autos[2].id },
    // Амортизатор для BMW
    { autopart_id: autoparts[5].id, auto_id: autos[0].id },
    { autopart_id: autoparts[6].id, auto_id: autos[0].id },
    // Топливный фильтр для VW, Audi
    { autopart_id: autoparts[7].id, auto_id: autos[2].id },
    { autopart_id: autoparts[7].id, auto_id: autos[3].id },
    // Свечи для японских авто
    { autopart_id: autoparts[8].id, auto_id: autos[4].id },
    { autopart_id: autoparts[8].id, auto_id: autos[5].id },
    // Воздушный фильтр Mahle для Ford, Opel
    { autopart_id: autoparts[11].id, auto_id: autos[6].id },
    { autopart_id: autoparts[11].id, auto_id: autos[7].id },
  ];

  for (const data of autopartsAutosData) {
    await prisma.autopartsAutos.create({ data });
  }
  console.log(`✅ Создано ${autopartsAutosData.length} связей запчастей с автомобилями`);

  // 9.5. Создание связей запчастей с объемами двигателей
  console.log('🔗 Создание связей запчастей с объемами двигателей...');
  const autopartsEngineVolumesData = [
    // Масляный фильтр Bosch - для двигателей 1.8, 2.0, 2.2, 2.5
    { autopart_id: autoparts[0].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[0].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[0].id, engine_volume_id: engineVolumes[3].id }, // 2.2
    { autopart_id: autoparts[0].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    // Масляный фильтр Mann - для 1.6, 1.8, 2.0
    { autopart_id: autoparts[1].id, engine_volume_id: engineVolumes[0].id }, // 1.6
    { autopart_id: autoparts[1].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[1].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    // Воздушный фильтр Mann - универсальный для многих объемов
    { autopart_id: autoparts[2].id, engine_volume_id: engineVolumes[0].id }, // 1.6
    { autopart_id: autoparts[2].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[2].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[2].id, engine_volume_id: engineVolumes[3].id }, // 2.2
    // Тормозные колодки Brembo - для средних и крупных объемов
    { autopart_id: autoparts[3].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[3].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[3].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    { autopart_id: autoparts[3].id, engine_volume_id: engineVolumes[6].id }, // 2.8
    { autopart_id: autoparts[3].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    // Тормозные диски передние - аналогично колодкам
    { autopart_id: autoparts[4].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[4].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[4].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    { autopart_id: autoparts[4].id, engine_volume_id: engineVolumes[6].id }, // 2.8
    { autopart_id: autoparts[4].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    // Амортизатор передний - универсальный
    { autopart_id: autoparts[5].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[5].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[5].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    { autopart_id: autoparts[5].id, engine_volume_id: engineVolumes[6].id }, // 2.8
    // Амортизатор усиленный - для более мощных двигателей
    { autopart_id: autoparts[6].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    { autopart_id: autoparts[6].id, engine_volume_id: engineVolumes[6].id }, // 2.8
    { autopart_id: autoparts[6].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    // Топливный фильтр - малые и средние объемы
    { autopart_id: autoparts[7].id, engine_volume_id: engineVolumes[0].id }, // 1.6
    { autopart_id: autoparts[7].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[7].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    // Свечи зажигания - для японских моторов 2.0, 2.4, 3.0, 3.5
    { autopart_id: autoparts[8].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[8].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[8].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    { autopart_id: autoparts[8].id, engine_volume_id: engineVolumes[8].id }, // 3.5
    // Комплект сцепления - средние объемы
    { autopart_id: autoparts[9].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[9].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[9].id, engine_volume_id: engineVolumes[3].id }, // 2.2
    // Стартер - японские авто
    { autopart_id: autoparts[10].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[10].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[10].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    // Воздушный фильтр Mahle - для Ford, Opel (малые объемы)
    { autopart_id: autoparts[11].id, engine_volume_id: engineVolumes[0].id }, // 1.6
    { autopart_id: autoparts[11].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[11].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    // Подшипник ступицы - универсальный
    { autopart_id: autoparts[12].id, engine_volume_id: engineVolumes[0].id }, // 1.6
    { autopart_id: autoparts[12].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[12].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[12].id, engine_volume_id: engineVolumes[3].id }, // 2.2
    // Масляный фильтр Mahle - современные двигатели
    { autopart_id: autoparts[13].id, engine_volume_id: engineVolumes[1].id }, // 1.8
    { autopart_id: autoparts[13].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[13].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[13].id, engine_volume_id: engineVolumes[7].id }, // 3.0
    // Тормозные диски задние
    { autopart_id: autoparts[14].id, engine_volume_id: engineVolumes[2].id }, // 2.0
    { autopart_id: autoparts[14].id, engine_volume_id: engineVolumes[4].id }, // 2.4
    { autopart_id: autoparts[14].id, engine_volume_id: engineVolumes[5].id }, // 2.5
    { autopart_id: autoparts[14].id, engine_volume_id: engineVolumes[6].id }, // 2.8
  ];

  for (const data of autopartsEngineVolumesData) {
    await prisma.autopartsEngineVolumes.create({ data });
  }
  console.log(`✅ Создано ${autopartsEngineVolumesData.length} связей запчастей с объемами двигателей`);

  // 10. Создание количеств на складах
  console.log('📦 Создание количеств на складах...');
  const warehouseData = [];
  for (const autopart of autoparts) {
    // Каждая запчасть на 1-3 складах с разным количеством
    const numWarehouses = Math.floor(Math.random() * 3) + 1;
    const selectedWarehouses = warehouses
      .sort(() => Math.random() - 0.5)
      .slice(0, numWarehouses);

    for (const warehouse of selectedWarehouses) {
      warehouseData.push({
        autopart_id: autopart.id,
        warehouse_id: warehouse.id,
        quantity: Math.floor(Math.random() * 50) + 1,
      });
    }
  }

  for (const data of warehouseData) {
    await prisma.autopartsWarehouses.create({ data });
  }
  console.log(`✅ Создано ${warehouseData.length} записей о количествах на складах`);

  // 11. Создание цен
  console.log('💰 Создание цен...');
  const pricesData = [];
  for (const autopart of autoparts) {
    // Базовая цена
    const basePrice = Math.floor(Math.random() * 5000) + 100;

    for (let i = 0; i < priceTypes.length; i++) {
      // Розничная - базовая, оптовая -10%, VIP -20%, дилерская -30%
      const discount = i * 0.1;
      const price = Math.round(basePrice * (1 - discount));

      pricesData.push({
        autopart_id: autopart.id,
        pricesType_id: priceTypes[i].id,
        price: price,
      });
    }
  }

  for (const data of pricesData) {
    await prisma.autopartPrices.create({ data });
  }
  console.log(`✅ Создано ${pricesData.length} цен`);

  // 12. Создание аналогов
  console.log('🔄 Создание аналогов...');
  const analogues = [
    // Масляные фильтры - аналоги
    { partAId: autoparts[0].id, partBId: autoparts[1].id },
    { partAId: autoparts[0].id, partBId: autoparts[13].id },
    { partAId: autoparts[1].id, partBId: autoparts[13].id },
    // Воздушные фильтры - аналоги
    { partAId: autoparts[2].id, partBId: autoparts[11].id },
    // Амортизаторы - аналоги
    { partAId: autoparts[5].id, partBId: autoparts[6].id },
    // Тормозные диски
    { partAId: autoparts[4].id, partBId: autoparts[14].id },
  ];

  for (const data of analogues) {
    await prisma.analogues.create({ data });
  }
  console.log(`✅ Создано ${analogues.length} записей об аналогах`);

  // 13. Создание клиентов
  console.log('👤 Создание клиентов...');
  const clients = await Promise.all([
    prisma.clients.create({
      data: {
        name: 'ИП Иванов',
        fullName: 'Индивидуальный предприниматель Иванов Иван Иванович',
        address: 'г. Киев, ул. Бизнес, 5',
      },
    }),
    prisma.clients.create({
      data: {
        name: 'ООО "АвтоСервис"',
        fullName: 'Общество с ограниченной ответственностью "АвтоСервис"',
        address: 'г. Харьков, пр. Автомобилистов, 12',
      },
    }),
    prisma.clients.create({
      data: {
        name: 'Петров П.П.',
        fullName: 'Петров Петр Петрович',
        address: 'г. Одесса, ул. Морская, 23',
      },
    }),
    prisma.clients.create({
      data: {
        name: 'ТОВ "Запчасти"',
        fullName: 'Товариство з обмеженою відповідальністю "Запчасти"',
        address: 'г. Днепр, ул. Промышленная, 78',
      },
    }),
  ]);
  console.log(`✅ Создано ${clients.length} клиентов`);

  // 14. Создание способов доставки
  console.log('🚚 Создание способов доставки...');
  const deliveryMethods = await Promise.all([
    prisma.deliveryMethods.create({
      data: { name: 'Самовывоз', hexColor: '#3B82F6' },
    }),
    prisma.deliveryMethods.create({
      data: { name: 'Курьер', hexColor: '#10B981' },
    }),
    prisma.deliveryMethods.create({
      data: { name: 'Новая Почта', hexColor: '#F59E0B' },
    }),
    prisma.deliveryMethods.create({
      data: { name: 'Укрпочта', hexColor: '#6366F1' },
    }),
  ]);
  console.log(`✅ Создано ${deliveryMethods.length} способов доставки`);

  // 15. Связь клиентов со способами доставки
  console.log('🔗 Создание связей клиентов со способами доставки...');
  const clientDeliveryData = [
    { client_id: clients[0].id, deliveryMethod_id: deliveryMethods[0].id },
    { client_id: clients[0].id, deliveryMethod_id: deliveryMethods[2].id },
    { client_id: clients[1].id, deliveryMethod_id: deliveryMethods[1].id },
    { client_id: clients[1].id, deliveryMethod_id: deliveryMethods[2].id },
    { client_id: clients[2].id, deliveryMethod_id: deliveryMethods[0].id },
    { client_id: clients[2].id, deliveryMethod_id: deliveryMethods[1].id },
    { client_id: clients[2].id, deliveryMethod_id: deliveryMethods[2].id },
    { client_id: clients[3].id, deliveryMethod_id: deliveryMethods[2].id },
    { client_id: clients[3].id, deliveryMethod_id: deliveryMethods[3].id },
  ];

  for (const data of clientDeliveryData) {
    await prisma.clientsDeliveryMethods.create({ data });
  }
  console.log(`✅ Создано ${clientDeliveryData.length} связей клиентов со способами доставки`);

  // 16. Создание статусов заказов
  console.log('📋 Создание статусов заказов...');
  const orderStatuses = await Promise.all([
    prisma.orderStatuses.create({
      data: { name: 'Новый', hexColor: '#3B82F6', isLast: false },
    }),
    prisma.orderStatuses.create({
      data: { name: 'В обработке', hexColor: '#F59E0B', isLast: false },
    }),
    prisma.orderStatuses.create({
      data: { name: 'Готов к выдаче', hexColor: '#10B981', isLast: false },
    }),
    prisma.orderStatuses.create({
      data: { name: 'Выдан', hexColor: '#8B5CF6', isLast: false },
    }),
    prisma.orderStatuses.create({
      data: { name: 'Оплачен', hexColor: '#059669', isLast: true },
    }),
    prisma.orderStatuses.create({
      data: { name: 'Отменен', hexColor: '#EF4444', isLast: true },
    }),
  ]);
  console.log(`✅ Создано ${orderStatuses.length} статусов заказов`);

  // 17. Создание заказов
  console.log('📝 Создание заказов...');
  const orders = [];
  
  // Заказ 1 - новый
  const order1 = await prisma.orders.create({
    data: {
      client_id: clients[0].id,
      deliveryMethod_id: deliveryMethods[0].id,
      orderStatus_id: orderStatuses[0].id,
      userId: admin.id,
      totalAmount: 800,
      discount: 0,
      notes: 'Срочный заказ, клиент ждет',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    },
  });
  orders.push(order1);

  // Заказ 2 - в обработке
  const order2 = await prisma.orders.create({
    data: {
      client_id: clients[1].id,
      deliveryMethod_id: deliveryMethods[1].id,
      orderStatus_id: orderStatuses[1].id,
      userId: users[0].id,
      totalAmount: 5980,
      discount: 300,
      notes: 'Оптовый клиент, предоставлена скидка',
      deliveryAddress: 'г. Харьков, пр. Автомобилистов, 12, офис 5',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 день назад
    },
  });
  orders.push(order2);

  // Заказ 3 - готов к выдаче
  const order3 = await prisma.orders.create({
    data: {
      client_id: clients[2].id,
      deliveryMethod_id: deliveryMethods[2].id,
      orderStatus_id: orderStatuses[2].id,
      userId: admin.id,
      totalAmount: 4920,
      discount: 0,
      trackingNumber: '59000123456789',
      deliveryAddress: 'г. Одесса, отделение Новой Почты №15',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 дня назад
      issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 часов назад
    },
  });
  orders.push(order3);

  // Заказ 4 - выдан
  const order4 = await prisma.orders.create({
    data: {
      client_id: clients[3].id,
      deliveryMethod_id: deliveryMethods[2].id,
      orderStatus_id: orderStatuses[3].id,
      userId: users[0].id,
      totalAmount: 8500,
      discount: 0,
      trackingNumber: '59000987654321',
      notes: 'Заказ выдан в отделении Новой Почты',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 дней назад
      issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 дня назад
    },
  });
  orders.push(order4);

  // Заказ 5 - оплачен
  const order5 = await prisma.orders.create({
    data: {
      client_id: clients[0].id,
      deliveryMethod_id: deliveryMethods[0].id,
      orderStatus_id: orderStatuses[4].id,
      userId: admin.id,
      totalAmount: 1100,
      discount: 0,
      notes: 'Самовывоз со склада, оплачено наличными',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 дней назад
      issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 дней назад
      paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 дня назад
    },
  });
  orders.push(order5);

  // Заказ 6 - отменен
  const order6 = await prisma.orders.create({
    data: {
      client_id: clients[1].id,
      deliveryMethod_id: deliveryMethods[3].id,
      orderStatus_id: orderStatuses[5].id,
      userId: users[0].id,
      totalAmount: 15000,
      discount: 0,
      notes: 'Клиент отказался от заказа',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 дней назад
    },
  });
  orders.push(order6);

  console.log(`✅ Создано ${orders.length} заказов`);

  // 18. Создание позиций заказов
  console.log('📦 Создание позиций заказов...');
  const orderItemsData = [
    // Заказ 1
    {
      order_id: order1.id,
      autopart_id: autoparts[0].id,
      warehouse_id: warehouses[0].id,
      quantity: 2,
      item_final_price: 450,
      article: autoparts[0].article,
      description: autoparts[0].description,
    },
    {
      order_id: order1.id,
      autopart_id: autoparts[2].id,
      warehouse_id: warehouses[0].id,
      quantity: 1,
      item_final_price: 350,
      article: autoparts[2].article,
      description: autoparts[2].description,
    },
    // Заказ 2
    {
      order_id: order2.id,
      autopart_id: autoparts[3].id,
      warehouse_id: warehouses[1].id,
      quantity: 1,
      item_final_price: 2500,
      article: autoparts[3].article,
      description: autoparts[3].description,
    },
    {
      order_id: order2.id,
      autopart_id: autoparts[4].id,
      warehouse_id: warehouses[1].id,
      quantity: 2,
      item_final_price: 3200,
      article: autoparts[4].article,
      description: autoparts[4].description,
    },
    {
      order_id: order2.id,
      autopart_id: autoparts[8].id,
      warehouse_id: warehouses[1].id,
      quantity: 4,
      item_final_price: 280,
      article: autoparts[8].article,
      description: autoparts[8].description,
    },
    // Заказ 3
    {
      order_id: order3.id,
      autopart_id: autoparts[5].id,
      warehouse_id: warehouses[0].id,
      quantity: 2,
      item_final_price: 4500,
      article: autoparts[5].article,
      description: autoparts[5].description,
    },
    {
      order_id: order3.id,
      autopart_id: autoparts[1].id,
      warehouse_id: warehouses[0].id,
      quantity: 1,
      item_final_price: 420,
      article: autoparts[1].article,
      description: autoparts[1].description,
    },
    // Заказ 4
    {
      order_id: order4.id,
      autopart_id: autoparts[9].id,
      warehouse_id: warehouses[2].id,
      quantity: 1,
      item_final_price: 8500,
      article: autoparts[9].article,
      description: autoparts[9].description,
    },
    // Заказ 5
    {
      order_id: order5.id,
      autopart_id: autoparts[7].id,
      warehouse_id: warehouses[0].id,
      quantity: 1,
      item_final_price: 650,
      article: autoparts[7].article,
      description: autoparts[7].description,
    },
    {
      order_id: order5.id,
      autopart_id: autoparts[0].id,
      warehouse_id: warehouses[0].id,
      quantity: 1,
      item_final_price: 450,
      article: autoparts[0].article,
      description: autoparts[0].description,
    },
    // Заказ 6 (отменен)
    {
      order_id: order6.id,
      autopart_id: autoparts[10].id,
      warehouse_id: warehouses[1].id,
      quantity: 1,
      item_final_price: 15000,
      article: autoparts[10].article,
      description: autoparts[10].description,
    },
  ];

  for (const data of orderItemsData) {
    await prisma.orderItems.create({ data });
  }
  console.log(`✅ Создано ${orderItemsData.length} позиций заказов`);

  // 19. Создание истории статусов заказов
  console.log('📜 Создание истории статусов заказов...');
  const statusHistoryData = [
    // История для заказа 1 (новый)
    {
      order_id: order1.id,
      orderStatus_id: orderStatuses[0].id,
      userId: admin.id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    // История для заказа 2 (новый -> в обработке)
    {
      order_id: order2.id,
      orderStatus_id: orderStatuses[0].id,
      userId: users[0].id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      order_id: order2.id,
      orderStatus_id: orderStatuses[1].id,
      userId: users[0].id,
      comment: 'Заказ принят в обработку',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    },
    // История для заказа 3 (новый -> в обработке -> готов к выдаче)
    {
      order_id: order3.id,
      orderStatus_id: orderStatuses[0].id,
      userId: admin.id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      order_id: order3.id,
      orderStatus_id: orderStatuses[1].id,
      userId: admin.id,
      comment: 'Заказ принят в обработку',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40),
    },
    {
      order_id: order3.id,
      orderStatus_id: orderStatuses[2].id,
      userId: admin.id,
      comment: 'Заказ отправлен в отделение Новой Почты',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
    // История для заказа 4 (полный цикл до выдан)
    {
      order_id: order4.id,
      orderStatus_id: orderStatuses[0].id,
      userId: users[0].id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      order_id: order4.id,
      orderStatus_id: orderStatuses[1].id,
      userId: users[0].id,
      comment: 'Заказ принят в обработку',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    },
    {
      order_id: order4.id,
      orderStatus_id: orderStatuses[2].id,
      userId: admin.id,
      comment: 'Заказ готов к выдаче',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 60 * 2),
    },
    {
      order_id: order4.id,
      orderStatus_id: orderStatuses[3].id,
      userId: admin.id,
      comment: 'Заказ выдан клиенту',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    // История для заказа 5 (полный цикл до оплачен)
    {
      order_id: order5.id,
      orderStatus_id: orderStatuses[0].id,
      userId: admin.id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      order_id: order5.id,
      orderStatus_id: orderStatuses[1].id,
      userId: admin.id,
      comment: 'Заказ принят в обработку',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
    },
    {
      order_id: order5.id,
      orderStatus_id: orderStatuses[2].id,
      userId: admin.id,
      comment: 'Заказ готов к выдаче',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 - 1000 * 60 * 60 * 2),
    },
    {
      order_id: order5.id,
      orderStatus_id: orderStatuses[3].id,
      userId: admin.id,
      comment: 'Заказ выдан клиенту',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      order_id: order5.id,
      orderStatus_id: orderStatuses[4].id,
      userId: admin.id,
      comment: 'Заказ оплачен наличными',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    },
    // История для заказа 6 (отменен)
    {
      order_id: order6.id,
      orderStatus_id: orderStatuses[0].id,
      userId: users[0].id,
      comment: 'Заказ создан',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    },
    {
      order_id: order6.id,
      orderStatus_id: orderStatuses[5].id,
      userId: users[0].id,
      comment: 'Заказ отменен по запросу клиента',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
    },
  ];

  for (const data of statusHistoryData) {
    await prisma.orderStatusHistory.create({ data });
  }
  console.log(`✅ Создано ${statusHistoryData.length} записей истории статусов`);

  // 20. Создание логов изменений
  console.log('📜 Создание логов изменений...');
  const logs = [
    {
      autopartId: autoparts[0].id,
      userId: admin.id,
      action: 'updated',
      field: 'quantity',
      oldValue: '10',
      newValue: '15',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    {
      autopartId: autoparts[3].id,
      userId: admin.id,
      action: 'moved',
      field: 'warehouse',
      oldValue: `Склад №2`,
      newValue: `Основной склад`,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      autopartId: autoparts[5].id,
      userId: users[0].id,
      action: 'updated',
      field: 'price',
      oldValue: '4200',
      newValue: '4500',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ];

  for (const log of logs) {
    await prisma.autopartLog.create({ data: log });
  }
  console.log(`✅ Создано ${logs.length} записей в логах`);

  console.log('\n✨ База данных успешно заполнена моковыми данными!');
  console.log('\n📊 Сводка:');
  console.log(`   - Типов цен: ${priceTypes.length}`);
  console.log(`   - Складов: ${warehouses.length}`);
  console.log(`   - Пользователей: ${users.length + 1}`);
  console.log(`   - Брендов: ${brands.length}`);
  console.log(`   - Категорий: ${categories.length}`);
  console.log(`   - Автомобилей: ${autos.length}`);
  console.log(`   - Объемов двигателей: ${engineVolumes.length}`);
  console.log(`   - Автозапчастей: ${autoparts.length}`);
  console.log(`   - Клиентов: ${clients.length}`);
  console.log(`   - Способов доставки: ${deliveryMethods.length}`);
  console.log(`   - Статусов заказов: ${orderStatuses.length}`);
  console.log(`   - Заказов: ${orders.length}`);
  console.log(`   - Позиций заказов: ${orderItemsData.length}`);
  console.log(`   - Истории статусов: ${statusHistoryData.length}`);
  console.log(`   - Аналогов: ${analogues.length}`);
  console.log(`   - Логов: ${logs.length}`);
  console.log('\n🔑 Тестовые учетные данные:');
  console.log('   - Администратор: admin@autohub.com / password123');
  console.log('   - Пользователь 1: ivan@example.com / password123');
  console.log('   - Пользователь 2: maria@example.com / password123');
  console.log('   - Пользователь 3: alex@example.com / password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

