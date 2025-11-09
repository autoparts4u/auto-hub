# Логика проверки телефона при авторизации

## Как работает

### 1. При регистрации
Пользователь **обязан** указать телефон в форме регистрации:

```tsx
// app/(auth)/sign-up/page.tsx
<Input
  name="phone"
  placeholder="Телефон"
  type="tel"
  required  // ← обязательное поле
/>
```

### 2. Где хранится phone
**Phone хранится в Client, а не в User:**

```typescript
// Структура
User {
  id: string
  email: string
  clientId: string
  client: {
    phone: string  // ← здесь!
  }
}
```

### 3. Проверка при входе в shop
При попытке зайти в магазин проверяется наличие phone:

```typescript
// app/shop/page.tsx
if (!session.user.client?.phone) {
  redirect("/add-phone");  // ← перенаправляет если нет phone
}
```

### 4. Страница /add-phone
Если phone не указан (например, при регистрации через Google), пользователь перенаправляется на `/add-phone` для ввода телефона.

```typescript
// app/(auth)/add-phone/page.tsx
// Позволяет ввести phone и сохранить его в Client
```

---

## Важные изменения после реорганизации

### Было:
```typescript
session.user.phone  // ❌ phone был в User
```

### Стало:
```typescript
session.user.client.phone  // ✅ phone в Client
```

---

## Session структура

```typescript
session.user = {
  id: string
  email: string
  role: "admin" | "user"
  isConfirmed: boolean
  clientId: string
  client: {
    id: string
    name: string
    phone: string | null  // ← phone здесь
  }
}
```

---

## API endpoints

### Обновить phone
```http
PATCH /api/users/phone
Body: { "phone": "+380501234567" }
```

**Что происходит:**
1. Получает clientId пользователя
2. Обновляет phone в таблице Clients
3. При следующем входе phone будет доступен в session

---

## Сценарии использования

### Сценарий 1: Обычная регистрация с phone
1. Пользователь регистрируется, указывает phone
2. Создается Client с указанным phone
3. Создается User, связанный с Client
4. ✅ При входе в /shop проверка проходит

### Сценарий 2: Регистрация через Google (без phone)
1. Пользователь регистрируется через Google
2. Создается Client без phone
3. При попытке зайти в /shop:
   - Проверка `session.user.client?.phone` → null
   - Редирект на `/add-phone`
4. Пользователь вводит phone
5. Phone сохраняется в Client
6. ✅ Теперь доступ к /shop открыт

### Сценарий 3: Админ создал клиента с phone → клиент регистрируется
1. Админ создает Client: "ООО Компания", phone: +380501234567
2. Пользователь регистрируется с phone: +380501234567
3. Система находит существующий Client
4. User связывается с найденным Client
5. ✅ Phone уже есть, редиректа на /add-phone не будет

---

## Преимущества новой структуры

✅ **Единый источник данных** - phone хранится только в Client  
✅ **Бизнес-логика** - phone относится к компании, а не к пользователю  
✅ **Автоматическое связывание** - при регистрации с существующим phone  
✅ **Гибкость** - можно менять phone без влияния на User  

---

## Что обновлено

### Файлы с изменениями:

1. **`app/types/next-auth.d.ts`**
   - Обновлены типы Session и User
   - Добавлен `client.phone` в session

2. **`lib/auth.ts`**
   - Session callback загружает данные клиента
   - Phone доступен через `session.user.client.phone`

3. **`app/shop/page.tsx`**
   - Проверка изменена на `session.user.client?.phone`
   - Если нет → редирект на `/add-phone`

4. **`app/api/users/phone/route.ts`**
   - Обновляет phone в Client вместо User

5. **`lib/actions.ts`**
   - При регистрации создает Client с phone
   - Или связывает с существующим Client по phone

---

## Тестирование

### Проверьте:

1. ✅ Регистрация с phone → сразу доступ к /shop
2. ✅ Регистрация без phone → редирект на /add-phone
3. ✅ Ввод phone на /add-phone → доступ к /shop
4. ✅ Админ создал Client с phone → пользователь регистрируется → автоматическая связь

