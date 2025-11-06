# Исправление: React "Cannot update a component while rendering"

## Проблема

При использовании утилит расчета оплаты в `OrderDetailsModal.tsx` возникала ошибка:
```
Cannot update a component (Router) while rendering a different component (OrderDetailsModal)
```

## Причина

Утилиты (`calculateOrderTotal`, `calculateRemainingAmount`, `isOrderFullyPaid`) импортировались из файла с `'use server'` директивой (`lib/actions/orderPaymentActions.ts`).

React интерпретирует **все экспортируемые функции** из файла с `'use server'` как Server Actions (async функции), даже если они помечены как реэкспорт. При попытке вызвать их во время рендера возникает ошибка.

## Решение

Разделили импорты в клиентских компонентах:

### ❌ Было (неправильно):
```typescript
import {
  addPartialPayment,
  markOrderAsFullyPaid,
  calculateOrderTotal,        // ❌ Из файла с 'use server'
  calculateRemainingAmount,   // ❌ Из файла с 'use server'
  isOrderFullyPaid,          // ❌ Из файла с 'use server'
} from '@/lib/actions/orderPaymentActions';
```

### ✅ Стало (правильно):
```typescript
// Server Actions - из файла с 'use server'
import {
  addPartialPayment,
  markOrderAsFullyPaid,
} from '@/lib/actions/orderPaymentActions';

// Утилиты - из обычного файла
import {
  calculateOrderTotal,
  calculateRemainingAmount,
  isOrderFullyPaid,
} from '@/lib/utils/orderPaymentUtils';
```

## Правило

**В клиентских компонентах (`'use client'`):**
- ✅ Импортируйте утилиты (sync функции) из `@/lib/utils/orderPaymentUtils`
- ✅ Импортируйте Server Actions (async функции) из `@/lib/actions/orderPaymentActions`

**В серверных компонентах / API routes:**
- ✅ Можно импортировать всё из `@/lib/actions/orderPaymentActions`

## Файлы, которые были изменены

- `components/orders/OrderDetailsModal.tsx` - исправлены импорты
- `PAYMENT_ACTIONS_QUICKSTART.md` - добавлены правила импортов
- `ORDER_PAYMENT_ACTIONS_DOCS.md` - добавлено предупреждение

## Статус

✅ **Исправлено** - ошибка больше не возникает, страница работает корректно.

