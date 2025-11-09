# Руководство по миграции базы данных

## Обзор изменений

Мы реорганизовали структуру данных, чтобы устранить дублирование между `User` и `Clients`:

### Было:
- **User**: содержал auth данные + бизнес данные (name, phone, address, priceAccessId, warehouseAccessId)
- **Clients**: содержал бизнес данные + опциональную связь с User

### Стало:
- **User**: только auth данные (email, password, role, isConfirmed) + обязательная связь с Client
- **Clients**: все бизнес данные (name, phone, address, priceAccessId, warehouseAccessId)

## Шаги миграции

### ⚠️ ВАЖНО: Создайте резервную копию базы данных перед миграцией!

```bash
pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 1: Подготовка данных

Этот скрипт создаст Client для каждого существующего User и перенесет данные:

```sql
-- Для каждого User создаем соответствующий Client с его данными
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
    SELECT 1 FROM "Clients" c 
    WHERE c.phone = u.phone 
    AND u.phone IS NOT NULL
);
```

### Шаг 2: Временно изменить схему для добавления clientId

Временно измените `schema.prisma`:

```prisma
model User {
    // ... остальные поля
    clientId String? @unique // Сделать nullable временно
    client   Clients? @relation(fields: [clientId], references: [id])
}
```

Затем:

```bash
npx prisma migrate dev --name add-nullable-clientid
```

### Шаг 3: Связать User с Client

```sql
-- Связываем каждого User с Client по phone (если есть) или создаем нового
UPDATE "User" u
SET "clientId" = (
    SELECT c.id 
    FROM "Clients" c 
    WHERE c.phone = u.phone 
    AND u.phone IS NOT NULL
    LIMIT 1
);

-- Для User без phone или без совпадений создаем новых Clients
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
WHERE u."clientId" IS NULL
RETURNING id;

-- Обновляем User, у которых все еще нет clientId
UPDATE "User" u
SET "clientId" = c.id
FROM "Clients" c
WHERE c."fullName" = COALESCE(u.name, u.email)
AND u."clientId" IS NULL
AND c."userId" IS NULL;
```

### Шаг 4: Проверка данных

```sql
-- Убедитесь, что все User имеют clientId
SELECT COUNT(*) FROM "User" WHERE "clientId" IS NULL;
-- Должно вернуть 0
```

### Шаг 5: Применить финальную схему

Теперь примените финальную схему (которая уже обновлена):

```bash
npx prisma generate
npx prisma migrate dev --name restructure-user-client-final
```

### Шаг 6: Обновить Prisma Client

```bash
npx prisma generate
```

### Шаг 7: Проверка

Запустите приложение и проверьте:
- ✅ Пользователи могут авторизоваться
- ✅ Данные клиентов отображаются правильно
- ✅ Можно создавать/редактировать клиентов
- ✅ Можно создавать заказы

## Откат миграции (если что-то пошло не так)

```bash
# Восстановить из бэкапа
psql -h localhost -U your_user -d your_database < backup_file.sql

# Откатить к предыдущей схеме
git checkout HEAD~1 lib/db/schema.prisma
npx prisma generate
npx prisma db push --force-reset
```

## Автоматический скрипт миграции

Для упрощения, можно запустить:

```bash
# 1. Резервная копия
npm run db:backup

# 2. Миграция
npm run db:migrate
```

Добавьте в `package.json`:

```json
{
  "scripts": {
    "db:backup": "pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql",
    "db:migrate": "npx prisma migrate dev"
  }
}
```

