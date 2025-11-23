# Настройка автоматического резервного копирования в Google Drive

Данный документ описывает процесс настройки автоматического резервного копирования базы данных PostgreSQL в Google Drive.

## Обзор

- **Частота**: каждые 6 часов (00:00, 06:00, 12:00, 18:00 UTC)
- **Формат файла**: `auto-hub-backup_YYYY-MM-DD_HH-MM-SS.sql.gz`
- **Хранение**: 30 дней (настраивается в workflow)
- **Возможность ручного запуска**: да

## Шаг 1: Создание Google Cloud Service Account

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)

2. Создайте новый проект или выберите существующий

3. Включите Google Drive API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google Drive API"
   - Нажмите "Enable"

4. Создайте Service Account:
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "Service Account"
   - Заполните данные:
     - Name: `autohub-backup`
     - Description: `Service account for database backups`
   - Нажмите "Create and Continue"
   - Пропустите шаги с ролями (Skip)
   - Нажмите "Done"

5. Создайте ключ для Service Account:
   - Кликните на созданный Service Account
   - Перейдите во вкладку "Keys"
   - Нажмите "Add Key" > "Create new key"
   - Выберите формат JSON
   - Сохраните скачанный файл (это будет `GOOGLE_SERVICE_ACCOUNT_JSON`)

## Шаг 2: Настройка папки в Google Drive

1. Создайте папку в Google Drive для бэкапов (например, `AutoHub-Backups`)

2. Откройте свойства папки и скопируйте её ID из URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
   ID папки — это часть после `/folders/`

3. **Важно!** Предоставьте доступ Service Account к этой папке:
   - Откройте настройки доступа папки
   - Добавьте email Service Account (найдите его в Google Cloud Console, формат: `name@project-id.iam.gserviceaccount.com`)
   - Дайте права "Editor" (Редактор)

## Шаг 3: Добавление секретов в GitHub

Перейдите в настройки репозитория: `Settings` > `Secrets and variables` > `Actions`

Добавьте следующие секреты:

### 1. `DIRECT_URL`
Прямой URL подключения к базе данных PostgreSQL (без pooling).

```
postgresql://user:password@host:5432/database?sslmode=require
```

> Если используете Neon, это URL из раздела "Direct connection" в настройках базы данных.

### 2. `GOOGLE_SERVICE_ACCOUNT_JSON`
Содержимое JSON файла Service Account (из Шага 1.5).

Скопируйте всё содержимое файла как есть:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

### 3. `GDRIVE_BACKUP_FOLDER_ID`
ID папки в Google Drive (из Шага 2.2).

```
1ABC123xyz...
```

## Шаг 4: Проверка работы

### Ручной запуск

1. Перейдите в `Actions` в репозитории
2. Выберите workflow "Database Backup to Google Drive"
3. Нажмите "Run workflow"
4. Дождитесь завершения и проверьте логи

### Автоматический запуск

Workflow будет автоматически запускаться каждые 6 часов. Вы можете изменить расписание в файле `.github/workflows/backup.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Каждые 6 часов
```

Примеры других расписаний:
- `'0 0 * * *'` — раз в день в полночь
- `'0 */12 * * *'` — каждые 12 часов
- `'0 0 * * 0'` — раз в неделю (воскресенье)
- `'0 0 1 * *'` — раз в месяц (1-го числа)

## Настройка срока хранения бэкапов

По умолчанию бэкапы хранятся 30 дней. Чтобы изменить это, отредактируйте переменную в workflow:

```yaml
env:
  BACKUP_RETENTION_DAYS: 30  # Измените на нужное количество дней
```

## Структура имени файла бэкапа

```
auto-hub-backup_2025-12-07_18-00-00.sql.gz
                │          │
                │          └── Время создания (часы-минуты-секунды)
                └── Дата создания (год-месяц-день)
```

## Восстановление из бэкапа

1. Скачайте нужный бэкап из Google Drive

2. Распакуйте файл:
   ```bash
   gunzip auto-hub-backup_2025-12-07_18-00-00.sql.gz
   ```

3. Восстановите базу данных:
   ```bash
   psql $DATABASE_URL < auto-hub-backup_2025-12-07_18-00-00.sql
   ```

   Или через pg_restore если используете custom format:
   ```bash
   pg_restore -d $DATABASE_URL auto-hub-backup_2025-12-07_18-00-00.sql
   ```

## Troubleshooting

### Ошибка "Permission denied" при загрузке в Google Drive
- Убедитесь, что Service Account добавлен как редактор папки
- Проверьте правильность ID папки

### Ошибка подключения к базе данных
- Убедитесь, что `DIRECT_URL` указан правильно
- Проверьте, что IP GitHub Actions разрешён для подключения к БД

### Workflow не запускается по расписанию
- GitHub может задерживать scheduled workflows при высокой нагрузке
- Убедитесь, что в репозитории была активность за последние 60 дней

## Уведомления

Для добавления уведомлений о неудачных бэкапах, раскомментируйте и настройте секцию в workflow:

### Telegram
```yaml
- name: Send Telegram notification
  if: failure()
  run: |
    curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
      -d chat_id=${{ secrets.TELEGRAM_CHAT_ID }} \
      -d text="⚠️ Database backup failed! Check GitHub Actions logs."
```

### Slack
```yaml
- name: Send Slack notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: 'Database backup failed!'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
