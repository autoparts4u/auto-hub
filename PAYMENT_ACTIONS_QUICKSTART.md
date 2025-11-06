# Быстрый старт: Использование Payment Actions

## Что было сделано

Вся логика работы с оплатой заказов вынесена в отдельные модули:

- **`lib/utils/orderPaymentUtils.ts`** - чистые функции расчетов (клиент/сервер)
- **`lib/actions/orderPaymentActions.ts`** - Server Actions для работы с БД

> ⚠️ **ВАЖНО:** В клиентских компонентах (`'use client'`) импортируйте утилиты напрямую из `orderPaymentUtils.ts`, чтобы избежать ошибки "Cannot update a component while rendering"!

## Правильные импорты

### В клиентских компонентах (`'use client'`)

```typescript
// ✅ ПРАВИЛЬНО: Утилиты из utils, Server Actions из actions
import {
  addPartialPayment,
  markOrderAsFullyPaid,
} from '@/lib/actions/orderPaymentActions';
import {
  calculateOrderTotal,
  calculateRemainingAmount,
  isOrderFullyPaid,
} from '@/lib/utils/orderPaymentUtils';
```

```typescript
// ❌ НЕПРАВИЛЬНО: Утилиты из actions вызовут ошибку React
import {
  addPartialPayment,
  calculateOrderTotal, // ❌ Ошибка: Cannot update component while rendering
} from '@/lib/actions/orderPaymentActions';
```

### В серверных компонентах / API routes

```typescript
// ✅ В серверном коде можно импортировать всё из одного места
import {
  addPartialPayment,
  calculateOrderTotal,
  calculateRemainingAmount,
} from '@/lib/actions/orderPaymentActions';
```

## Основные функции

### 1. Добавить частичную оплату
```typescript
import { addPartialPayment } from '@/lib/actions/orderPaymentActions';

const result = await addPartialPayment(orderId, 500);

if (result.success) {
  console.log('Оплата добавлена!');
  console.log('Осталось:', result.data.remainingAmount);
}
```

### 2. Отметить как полностью оплаченный
```typescript
import { markOrderAsFullyPaid } from '@/lib/actions/orderPaymentActions';

const result = await markOrderAsFullyPaid(orderId);

if (result.success) {
  console.log('Заказ полностью оплачен!');
}
```

### 3. Вычислить итоговую сумму
```typescript
import { calculateOrderTotal } from '@/lib/actions/orderPaymentActions';

const total = calculateOrderTotal(1000, 100); // 900
```

### 4. Вычислить остаток
```typescript
import { calculateRemainingAmount } from '@/lib/actions/orderPaymentActions';

const remaining = calculateRemainingAmount(1000, 100, 300); // 600
```

### 5. Проверить оплату
```typescript
import { isOrderFullyPaid } from '@/lib/actions/orderPaymentActions';

const isPaid = isOrderFullyPaid(1000, 100, 900); // true
```

## Обновленный компонент OrderDetailsModal

Теперь использует новые actions:

- ✅ Кнопка **"Добавить"** - добавляет частичную оплату
- ✅ Кнопка **"Оплачено полностью"** - отмечает заказ как полностью оплаченный
- ✅ Поддержка Enter для быстрого добавления
- ✅ Состояние загрузки с индикатором
- ✅ Автоматическая очистка поля после успеха
- ✅ Умные сообщения об успехе/ошибке

## Преимущества нового подхода

1. **Переиспользуемость** - Функции можно использовать в любых компонентах
2. **Безопасность** - Все проверки на сервере
3. **Валидация** - Встроенная проверка данных
4. **Производительность** - Автоматическая ревалидация кеша
5. **Типизация** - Полная поддержка TypeScript
6. **Простота** - Меньше кода, проще поддержка

## Пример использования в новом компоненте

```typescript
'use client';

import { useState } from 'react';
import { addPartialPayment, calculateRemainingAmount } from '@/lib/actions/orderPaymentActions';

export function QuickPayment({ order }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const remaining = calculateRemainingAmount(
    order.totalAmount,
    order.discount,
    order.paidAmount
  );

  const handlePay = async () => {
    setLoading(true);
    const result = await addPartialPayment(order.id, parseFloat(amount));
    if (result.success) {
      alert('Оплата добавлена!');
      setAmount('');
    }
    setLoading(false);
  };

  return (
    <div>
      <p>Осталось: {remaining}</p>
      <input 
        value={amount} 
        onChange={(e) => setAmount(e.target.value)}
        disabled={loading}
      />
      <button onClick={handlePay} disabled={loading}>
        Оплатить
      </button>
    </div>
  );
}
```

## Дополнительные функции

### Сброс оплаты
```typescript
import { resetOrderPayment } from '@/lib/actions/orderPaymentActions';

const result = await resetOrderPayment(orderId);
```

### Получить полную информацию об оплате
```typescript
import { getOrderPaymentInfo } from '@/lib/actions/orderPaymentActions';

const result = await getOrderPaymentInfo(orderId);

if (result.success) {
  const { orderTotal, paidAmount, remainingAmount, isFullyPaid } = result.data;
  // Используйте данные
}
```

## Полная документация

См. `ORDER_PAYMENT_ACTIONS_DOCS.md` для детальной информации обо всех функциях.

