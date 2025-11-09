-- Миграция User-Client: перемещение бизнес-данных
-- Выполните этот скрипт ПЕРЕД изменением schema.prisma

BEGIN;

-- Шаг 1: Создать временную таблицу для маппинга User -> Client
CREATE TEMP TABLE user_client_map (
    user_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "User"(id),
    FOREIGN KEY (client_id) REFERENCES "Clients"(id)
);

-- Шаг 2: Для каждого User создать Client или использовать существующий
-- Сначала обработаем User, у которых уже есть связь через userId в Clients
INSERT INTO user_client_map (user_id, client_id)
SELECT u.id, c.id
FROM "User" u
INNER JOIN "Clients" c ON c."userId" = u.id;

-- Шаг 3: Для User без связанного Client - создаем новый Client
WITH new_clients AS (
    INSERT INTO "Clients" (
        id,
        name,
        "fullName",
        phone,
        address,
        "priceAccessId",
        "warehouseAccessId",
        "createdAt",
        "updatedAt"
    )
    SELECT 
        gen_random_uuid() as id,
        COALESCE(u.name, 'Клиент') as name,
        COALESCE(u.name, u.email) as "fullName",
        u.phone,
        u.address,
        u."priceAccessId",
        u."warehouseAccessId",
        u."createdAt",
        NOW() as "updatedAt"
    FROM "User" u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_client_map ucm WHERE ucm.user_id = u.id
    )
    RETURNING id, "fullName", phone
)
INSERT INTO user_client_map (user_id, client_id)
SELECT u.id, nc.id
FROM "User" u
CROSS JOIN new_clients nc
WHERE COALESCE(u.name, u.email) = nc."fullName"
  AND NOT EXISTS (
      SELECT 1 FROM user_client_map ucm WHERE ucm.user_id = u.id
  );

-- Шаг 4: Добавить временный столбец clientId в User (nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Шаг 5: Заполнить clientId для всех User
UPDATE "User" u
SET "clientId" = ucm.client_id
FROM user_client_map ucm
WHERE u.id = ucm.user_id;

-- Шаг 6: Проверка - все User должны иметь clientId
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM "User" WHERE "clientId" IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Миграция не удалась: найдено % User без clientId', null_count;
    END IF;
    RAISE NOTICE 'Проверка пройдена: все User имеют clientId';
END $$;

-- Шаг 7: Удалить старые столбцы из User (будет сделано в Prisma migration)
-- ALTER TABLE "User" DROP COLUMN IF EXISTS name;
-- ALTER TABLE "User" DROP COLUMN IF EXISTS phone;
-- ALTER TABLE "User" DROP COLUMN IF EXISTS address;
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "priceAccessId";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "warehouseAccessId";

-- Шаг 8: Сделать clientId обязательным (будет сделано в Prisma migration)
-- ALTER TABLE "User" ALTER COLUMN "clientId" SET NOT NULL;
-- CREATE UNIQUE INDEX IF NOT EXISTS "User_clientId_key" ON "User"("clientId");
-- ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" 
--   FOREIGN KEY ("clientId") REFERENCES "Clients"(id) ON DELETE CASCADE;

COMMIT;

-- После выполнения этого скрипта:
-- 1. Обновите schema.prisma (уже обновлена)
-- 2. Запустите: npx prisma migrate dev --name restructure-user-client
-- 3. Prisma применит оставшиеся изменения схемы

