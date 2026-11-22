-- Бэкап таблицы _prisma_migrations перед baseline (0_init), снят 2026-11-22.
-- Восстановление: DELETE FROM "_prisma_migrations"; затем выполнить эти INSERT.
-- Строк в бэкапе: 8

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('78f0921a-242e-4957-ba89-7fab5bd9c169', 'fc02b098e45df3f073c9273d479c7eb4ea586acc98994a7071f9b4a241261f46', '2025-11-03T09:03:06.398Z', '20251103115245_fix_authopart_typo', '', NULL, '2025-11-03T09:03:06.398Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('9aaaf669-3143-4e41-ae83-54346a8bc4cf', '203f728a84f5f696341834d952e21d1c7ef2e2b2d73cfdb5c2e47f47cffb2d7d', NULL, '20250421221539_init', 'A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20250421221539_init

Database error code: 42P07

Database error:
ERROR: relation "health_check" already exists

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \"health_check\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1160), routine: Some("heap_create_with_catalog") }

   0: sql_schema_connector::apply_migration::apply_script
           with migration_name="20250421221539_init"
             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113
   1: schema_commands::commands::apply_migrations::Applying migration
           with migration_name="20250421221539_init"
             at schema-engine/commands/src/commands/apply_migrations.rs:91
   2: schema_core::state::ApplyMigrations
             at schema-engine/core/src/state.rs:231', '2026-08-19T22:22:10.180Z', '2025-11-20T22:37:24.279Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0a08a9c2-c0d4-43dc-8a41-4ab7c6e42da2', '1c5289ddc26956e84e6a578342fc80272e135dbf7d24cda62752efe9a1a2b0b8', '2026-08-19T22:19:58.838Z', '20251029125504_add_order_improvements_and_history', '', NULL, '2026-08-19T22:19:58.838Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('4fdc3b9e-f8fb-4a80-93ff-9d33c2aac7b2', 'dfa6c116b7cf474b8d384d551f06736fb6dac261c6d15fe05abdb287ad04b2fe', '2026-08-19T22:20:01.354Z', '20251030155256_add_paid_amount_to_orders', '', NULL, '2026-08-19T22:20:01.354Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e49d28c4-39aa-43f2-8516-f8e865cb8696', '8d64f1a01c72fe4faa7deef2392bec3cf9ea67644dbd279205c0a316050e6d79', '2026-08-19T22:20:06.262Z', '20251121013123_add_fuel_type', '', NULL, '2026-08-19T22:20:06.262Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3c7d3050-1e39-4def-9b93-3d6cbede373b', '93bce249c1c3ea4c1974649a318155c5ac9526f70d2cfe082c64b4e28da92846', '2026-08-19T22:20:08.722Z', '20260820005815_add_invisible_to_autoparts', '', NULL, '2026-08-19T22:20:08.722Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('fbff990a-c933-43c9-8fff-a7211df9c692', '203f728a84f5f696341834d952e21d1c7ef2e2b2d73cfdb5c2e47f47cffb2d7d', '2026-08-19T22:22:10.289Z', '20250421221539_init', '', NULL, '2026-08-19T22:22:10.289Z', 0);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('2f0acfda-047e-4571-924c-7d38d74b0272', 'c3d92a0749c54179d94535d181817c9cd270ff753f57a424ae7b90b3a2b20aa1', '2026-11-22T17:56:47.897Z', '20261122120000_add_short_description_to_autoparts', '', NULL, '2026-11-22T17:56:47.897Z', 0);
