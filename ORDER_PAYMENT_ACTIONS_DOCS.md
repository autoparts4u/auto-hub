# Документация: Order Payment Actions

## Обзор

Функционал работы с оплатой заказов разделен на два модуля:

- **`lib/utils/orderPaymentUtils.ts`** - чистые функции для расчетов (можно использовать на клиенте и сервере)
- **`lib/actions/orderPaymentActions.ts`** - серверные действия (Server Actions) для работы с базой данных

Все Server Actions используют Next.js Server Actions и автоматически ревалидируют кеш страниц.

## ⚠️ Важное правило импортов

**В клиентских компонентах (`'use client'`):**
- Импортируйте утилиты (`calculate*`, `isOrderFullyPaid`) **только** из `@/lib/utils/orderPaymentUtils`
- Импортируйте Server Actions (`add*`, `mark*`) из `@/lib/actions/orderPaymentActions`

**Почему?** Импорт утилит из файла с `'use server'` вызывает ошибку React: "Cannot update a component while rendering".

## Вспомогательные функции (утилиты)

> **Примечание:** Эти функции находятся в `lib/utils/orderPaymentUtils.ts` и реэкспортируются из `lib/actions/orderPaymentActions.ts`.

```typescript
// ✅ В клиентских компонентах - ТОЛЬКО из utils
import { calculateOrderTotal } from '@/lib/utils/orderPaymentUtils';

// ✅ В серверных компонентах / API routes - можно из любого места
import { calculateOrderTotal } from '@/lib/actions/orderPaymentActions';
import { calculateOrderTotal } from '@/lib/utils/orderPaymentUtils'; // Тоже OK
```

### `calculateOrderTotal(totalAmount, discount): number`

Рассчитывает итоговую сумму заказа с учетом скидки.

**Параметры:**
- `totalAmount` (number | null) - Общая сумма заказа
- `discount` (number) - Размер скидки

**Возвращает:** `number` - Итоговая сумма (totalAmount - discount)

**Пример:**
```typescript
import { calculateOrderTotal } from '@/lib/utils/orderPaymentUtils';

const total = calculateOrderTotal(1000, 100); // 900
```

---

### `calculateRemainingAmount(totalAmount, discount, paidAmount): number`

Рассчитывает остаток к оплате.

**Параметры:**
- `totalAmount` (number | null) - Общая сумма заказа
- `discount` (number) - Размер скидки
- `paidAmount` (number) - Уже оплаченная сумма

**Возвращает:** `number` - Остаток к оплате (не может быть отрицательным)

**Пример:**
```typescript
const remaining = calculateRemainingAmount(1000, 100, 300); // 600
```

---

### `isOrderFullyPaid(totalAmount, discount, paidAmount): boolean`

Проверяет, полностью ли оплачен заказ.

**Параметры:**
- `totalAmount` (number | null) - Общая сумма заказа
- `discount` (number) - Размер скидки
- `paidAmount` (number) - Уже оплаченная сумма

**Возвращает:** `boolean` - `true`, если оплачено полностью

**Пример:**
```typescript
const isPaid = isOrderFullyPaid(1000, 100, 900); // true
const isPaid2 = isOrderFullyPaid(1000, 100, 500); // false
```

---

## Server Actions

### `addPartialPayment(orderId, amount)`

Добавляет частичную оплату к заказу.

**Параметры:**
- `orderId` (string) - ID заказа
- `amount` (number) - Сумма платежа

**Возвращает:** `Promise<Result>`

**Структура успешного ответа:**
```typescript
{
  success: true,
  data: {
    order: Order,              // Обновленный заказ
    addedAmount: number,       // Добавленная сумма
    newPaidAmount: number,     // Новая общая сумма оплаты
    remainingAmount: number,   // Остаток к оплате
    isFullyPaid: boolean      // Флаг полной оплаты
  }
}
```

**Структура ответа с ошибкой:**
```typescript
{
  success: false,
  error: string  // Описание ошибки
}
```

**Особенности:**
- ✅ Автоматически устанавливает `paidAt` при достижении полной оплаты
- ✅ Валидирует сумму (не может превышать остаток)
- ✅ Требует права администратора
- ✅ Ревалидирует кеш страниц

**Пример использования:**
```typescript
const result = await addPartialPayment('order_123', 500);

if (result.success) {
  console.log('Добавлено:', result.data.addedAmount);
  console.log('Осталось:', result.data.remainingAmount);
  if (result.data.isFullyPaid) {
    console.log('Заказ полностью оплачен!');
  }
} else {
  console.error('Ошибка:', result.error);
}
```

---

### `markOrderAsFullyPaid(orderId)`

Отмечает заказ как полностью оплаченный (устанавливает `paidAmount` равным итоговой сумме).

**Параметры:**
- `orderId` (string) - ID заказа

**Возвращает:** `Promise<Result>`

**Структура успешного ответа:**
```typescript
{
  success: true,
  data: {
    order: Order,        // Обновленный заказ
    paidAmount: number  // Установленная сумма оплаты
  }
}
```

**Особенности:**
- ✅ Автоматически устанавливает `paidAt` на текущую дату
- ✅ Устанавливает `paidAmount` равным `(totalAmount - discount)`
- ✅ Требует права администратора
- ✅ Ревалидирует кеш страниц

**Пример использования:**
```typescript
const result = await markOrderAsFullyPaid('order_123');

if (result.success) {
  console.log('Заказ полностью оплачен!');
  console.log('Сумма:', result.data.paidAmount);
} else {
  console.error('Ошибка:', result.error);
}
```

---

### `resetOrderPayment(orderId)`

Сбрасывает оплату заказа (устанавливает `paidAmount = 0` и `paidAt = null`).

**Параметры:**
- `orderId` (string) - ID заказа

**Возвращает:** `Promise<Result>`

**Структура успешного ответа:**
```typescript
{
  success: true,
  data: {
    order: Order  // Обновленный заказ
  }
}
```

**Особенности:**
- ⚠️ Полностью сбрасывает информацию об оплате
- ✅ Требует права администратора
- ✅ Ревалидирует кеш страниц

**Пример использования:**
```typescript
const result = await resetOrderPayment('order_123');

if (result.success) {
  console.log('Оплата сброшена');
} else {
  console.error('Ошибка:', result.error);
}
```

---

### `getOrderPaymentInfo(orderId)`

Получает детальную информацию об оплате заказа.

**Параметры:**
- `orderId` (string) - ID заказа

**Возвращает:** `Promise<Result>`

**Структура успешного ответа:**
```typescript
{
  success: true,
  data: {
    orderId: string,
    totalAmount: number | null,
    discount: number,
    orderTotal: number,         // Рассчитанная итоговая сумма
    paidAmount: number,
    remainingAmount: number,    // Остаток к оплате
    isFullyPaid: boolean,
    paidAt: Date | null,
    client: {
      id: string,
      name: string
    }
  }
}
```

**Пример использования:**
```typescript
const result = await getOrderPaymentInfo('order_123');

if (result.success) {
  const { orderTotal, paidAmount, remainingAmount, isFullyPaid } = result.data;
  
  console.log(`Итого: ${orderTotal}`);
  console.log(`Оплачено: ${paidAmount}`);
  console.log(`Осталось: ${remainingAmount}`);
  console.log(`Статус: ${isFullyPaid ? 'Оплачено' : 'Не оплачено'}`);
} else {
  console.error('Ошибка:', result.error);
}
```

---

## Использование в компонентах

### Пример: Добавление частичной оплаты

```typescript
'use client';

import { useState } from 'react';
import { addPartialPayment } from '@/lib/actions/orderPaymentActions';
import { toast } from 'sonner';

function PaymentForm({ orderId }: { orderId: string }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    setLoading(true);
    
    try {
      const result = await addPartialPayment(orderId, paymentAmount);
      
      if (result.success) {
        toast.success(
          result.data?.isFullyPaid 
            ? 'Заказ полностью оплачен!' 
            : `Добавлено: ${paymentAmount}`
        );
        setAmount('');
      } else {
        toast.error(result.error || 'Ошибка при добавлении оплаты');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Обработка...' : 'Добавить оплату'}
      </button>
    </div>
  );
}
```

### Пример: Использование вспомогательных функций

```typescript
import {
  calculateOrderTotal,
  calculateRemainingAmount,
  isOrderFullyPaid,
} from '@/lib/actions/orderPaymentActions';

function OrderSummary({ order }) {
  const total = calculateOrderTotal(order.totalAmount, order.discount);
  const remaining = calculateRemainingAmount(
    order.totalAmount,
    order.discount,
    order.paidAmount
  );
  const isPaid = isOrderFullyPaid(
    order.totalAmount,
    order.discount,
    order.paidAmount
  );

  return (
    <div>
      <p>Итого: {total}</p>
      <p>Оплачено: {order.paidAmount}</p>
      <p>Осталось: {remaining}</p>
      <p>Статус: {isPaid ? '✅ Оплачено' : '⏳ Ожидает оплаты'}</p>
    </div>
  );
}
```

---

## Безопасность

Все Server Actions включают следующие проверки:

1. **Аутентификация** - Проверка наличия сессии пользователя
2. **Авторизация** - Проверка роли `admin`
3. **Валидация данных** - Проверка корректности входных параметров
4. **Защита от переплат** - Проверка, что оплата не превышает остаток

## Производительность

- ✅ Автоматическая ревалидация кеша Next.js
- ✅ Минимальные запросы к БД (только необходимые поля)
- ✅ Транзакционность операций обеспечивается Prisma

## Обработка ошибок

Все функции возвращают унифицированный формат ответа:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

Это позволяет легко обрабатывать ошибки:

```typescript
const result = await addPartialPayment(orderId, amount);

if (result.success) {
  // Работа с result.data
} else {
  // Обработка result.error
}
```

## Миграция с API endpoints

### Было (через API):
```typescript
const res = await fetch(`/api/orders/${orderId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paidAmount: newAmount }),
});
```

### Стало (через Server Actions):
```typescript
const result = await addPartialPayment(orderId, amount);
```

**Преимущества:**
- ✅ Меньше кода
- ✅ Встроенная валидация
- ✅ Автоматическая ревалидация
- ✅ Лучшая типизация
- ✅ Серверное выполнение (безопаснее)

