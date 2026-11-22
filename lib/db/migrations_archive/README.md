# Архив миграций (до baseline от 2026-11-22)

## Что здесь лежит
Семь исходных папок миграций и бэкап таблицы `_prisma_migrations`
(`_prisma_migrations_backup_20261122.sql`, 8 строк). Prisma их больше не читает:
активная история — одна миграция `lib/db/migrations/0_init`.

## Почему понадобился baseline
История миграций никогда не описывала реальную базу:

- `20250421221539_init` создаёт только таблицы аутентификации (`User`, `Account`,
  `Session`, `VerificationToken`, `Authenticator`, `health_check`). Остальные ~36
  таблиц (`Orders`, `Clients`, `Autoparts`, `Warehouses` и т.д.) появились в базе
  через `prisma db push`, миграций для них не создавалось.
- Поэтому все последующие миграции (`ALTER TABLE "Orders" ...`) не проигрываются
  на чистой базе. `prisma migrate dev` падал на shadow database:
  `P3006` / `P1014 The underlying table for model Orders does not exist`.
- В `_prisma_migrations` у всех восьми строк было `applied_steps_count = 0`:
  ни одна миграция реально не выполнялась, все были только помечены как
  применённые через `prisma migrate resolve`. Плюс одна сломанная строка
  `20250421221539_init` с `rolled_back_at`.

## Что было сделано (2026-11-22)
1. Проверено отсутствие дрейфа: `prisma migrate diff --from-schema-datasource
   --to-schema-datamodel` → «This is an empty migration», т.е. база в точности
   соответствует `schema.prisma`.
2. Baseline снят с **живой базы**: `prisma migrate diff --from-empty
   --to-schema-datasource lib/db/schema.prisma --script` → `lib/db/migrations/0_init/migration.sql`
   (2 enum-а, 42 таблицы, 25 индексов, 56 внешних ключей).
3. Старые папки миграций перенесены сюда, таблица `_prisma_migrations` выгружена
   в `_prisma_migrations_backup_20261122.sql`.
4. `prisma migrate resolve --applied 0_init` — baseline помечен как применённый
   (DDL по базе не выполнялся).
5. Восемь устаревших строк истории удалены по id.

Данные не затрагивались: до и после — 7844 строки в 42 таблицах (сверка
`count(*)` по всем таблицам). Менялась только служебная таблица
`_prisma_migrations`: 8 строк → 1 (`0_init`).

## Как откатить
```sql
DELETE FROM "_prisma_migrations";
-- затем выполнить INSERT-ы из _prisma_migrations_backup_20261122.sql
```
и вернуть папки миграций из этого архива в `lib/db/migrations/`.
