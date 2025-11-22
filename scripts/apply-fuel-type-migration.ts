import db from "../lib/db/db";

async function applyMigration() {
  try {
    console.log("Применение миграции для добавления FuelType...");

    // Проверяем, существует ли уже таблица FuelType
    const tableExists = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'FuelType'
      );
    `;

    if (tableExists[0]?.exists) {
      console.log("✅ Таблица FuelType уже существует");
    } else {
      // Создаем таблицу FuelType
      await db.$executeRaw`
        CREATE TABLE "FuelType" (
          "id" SERIAL NOT NULL,
          "name" TEXT NOT NULL,
          CONSTRAINT "FuelType_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log("✅ Таблица FuelType создана");
    }

    // Проверяем, существует ли уже индекс
    const indexExists = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'FuelType_name_key'
      );
    `;

    if (!indexExists[0]?.exists) {
      await db.$executeRaw`
        CREATE UNIQUE INDEX "FuelType_name_key" ON "FuelType"("name");
      `;
      console.log("✅ Индекс создан");
    } else {
      console.log("✅ Индекс уже существует");
    }

    // Проверяем, существует ли уже колонка fuel_type_id
    const columnExists = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Autoparts' 
        AND column_name = 'fuel_type_id'
      );
    `;

    if (!columnExists[0]?.exists) {
      await db.$executeRaw`
        ALTER TABLE "Autoparts" ADD COLUMN "fuel_type_id" INTEGER;
      `;
      console.log("✅ Колонка fuel_type_id добавлена");
    } else {
      console.log("✅ Колонка fuel_type_id уже существует");
    }

    // Проверяем, существует ли уже внешний ключ
    const fkExists = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'Autoparts_fuel_type_id_fkey'
      );
    `;

    if (!fkExists[0]?.exists) {
      await db.$executeRaw`
        ALTER TABLE "Autoparts" 
        ADD CONSTRAINT "Autoparts_fuel_type_id_fkey" 
        FOREIGN KEY ("fuel_type_id") 
        REFERENCES "FuelType"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `;
      console.log("✅ Внешний ключ создан");
    } else {
      console.log("✅ Внешний ключ уже существует");
    }

    console.log("\n✅ Миграция успешно применена!");
    console.log("Теперь можно использовать виды топлива в запчастях.");
  } catch (error) {
    console.error("❌ Ошибка при применении миграции:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

applyMigration();


