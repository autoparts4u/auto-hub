# Пошаговая инструкция по миграции

## ⚠️ ВНИМАНИЕ: Обязательно создайте резервную копию базы данных!

```bash
# Создать резервную копию
pg_dump DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Вариант 1: Автоматическая миграция (Рекомендуется)

### Шаг 1: Установите зависимости (если нужно)

```bash
npm install tsx --save-dev
```

### Шаг 2: Запустите скрипт миграции данных

```bash
npx tsx scripts/migrate-data.ts
```

Этот скрипт:
- Создаст Client для каждого User
- Перенесет все бизнес-данные (name, phone, address, priceAccessId, warehouseAccessId)
- Установит временные связи userId

### Шаг 3: Примените миграцию Prisma

```bash
npx prisma migrate dev --name restructure-user-client
```

Prisma:
- Добавит clientId в User
- Удалит старые поля из User
- Создаст правильные связи

### Шаг 4: Обновите Prisma Client

```bash
npx prisma generate
```

### Шаг 5: Перезапустите приложение

```bash
npm run dev
```

## Вариант 2: Ручная миграция через SQL

### Шаг 1: Выполните SQL скрипт

```bash
psql DATABASE_URL < scripts/migrate-user-client.sql
```

### Шаг 2: Примените миграцию Prisma

```bash
npx prisma migrate dev --name restructure-user-client
```

### Шаг 3: Обновите Prisma Client

```bash
npx prisma generate
```

## Проверка после миграции

Убедитесь что:
- [ ] Пользователи могут авторизоваться
- [ ] Данные клиентов отображаются
- [ ] Можно создавать/редактировать клиентов
- [ ] Можно создавать заказы
- [ ] Заказы показывают правильную информацию о клиентах

## Откат в случае проблем

```bash
# 1. Восстановить из бэкапа
psql DATABASE_URL < backup_file.sql

# 2. Откатить код
git checkout HEAD~1 lib/db/schema.prisma
git checkout HEAD~1 app/api/users/
git checkout HEAD~1 app/api/clients/
git checkout HEAD~1 components/clients/
git checkout HEAD~1 app/types/orders.ts

# 3. Обновить Prisma
npx prisma generate
npx prisma db push
```

## Важные изменения в коде

### API изменения:
- `GET /api/users` теперь возвращает `user.client` вместо прямых полей
- `PATCH /api/users/:id` обновляет данные через вложенный `client`
- `POST /api/clients` больше не принимает `email`
- `PUT /api/clients/:id` теперь принимает `warehouseAccessId`

### Типы TypeScript:
- `Client` больше не имеет `email` и `userId`
- `Client` теперь имеет `warehouseAccessId`
- `User` теперь имеет обязательное поле `clientId` и связь `client`

### Компоненты:
- `ClientModal` теперь принимает `warehouses` prop
- `UsersTable` работает через `user.client.*` вместо `user.*`
- `UserModal` обновляет данные через client

## Что изменилось

### Было:
```typescript
// User содержал все данные
user.name
user.phone
user.address
user.priceAccessId
user.warehouseAccessId
```

### Стало:
```typescript
// User только auth
user.email
user.role
user.isConfirmed

// Бизнес данные в Client
user.client.name
user.client.phone
user.client.address
user.client.priceAccessId
user.client.warehouseAccessId
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи консоли
2. Проверьте логи базы данных
3. Убедитесь что резервная копия создана
4. Можете откатить изменения (см. выше)

