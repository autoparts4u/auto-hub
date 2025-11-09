-- Миграция данных: перемещение бизнес-данных из User в Clients
-- Этот скрипт нужно выполнить ПЕРЕД применением schema миграции

-- Шаг 1: Для каждого User, который еще не связан с Client, создаем Client
-- Используем email как уникальный идентификатор для связи
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
    COALESCE(u.name, 'Клиент ' || SUBSTRING(u.email FROM 1 FOR 20)) as name,
    COALESCE(u.name, 'Клиент ' || u.email) as "fullName",
    u.phone,
    u.address,
    u."priceAccessId",
    u."warehouseAccessId",
    u."createdAt",
    NOW() as "updatedAt"
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "Clients" c WHERE c."userId" = u.id
);

-- Шаг 2: Связываем существующих User с только что созданными Clients
-- Обновляем Clients, устанавливая userId для связи
WITH user_client_mapping AS (
    SELECT 
        u.id as user_id,
        c.id as client_id
    FROM "User" u
    LEFT JOIN "Clients" c ON c."userId" IS NULL 
        AND c."fullName" = COALESCE(u.name, 'Клиент ' || u.email)
    WHERE c.id IS NOT NULL
)
UPDATE "Clients" c
SET "userId" = ucm.user_id
FROM user_client_mapping ucm
WHERE c.id = ucm.client_id;

-- После этого скрипта нужно:
-- 1. Обновить schema.prisma (уже сделано)
-- 2. Запустить: npx prisma migrate dev --name restructure-user-client
-- 3. Prisma автоматически добавит clientId в User и создаст связи

