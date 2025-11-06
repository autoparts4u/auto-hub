/**
 * Утилиты для расчетов оплаты заказов
 * Эти функции являются чистыми функциями и могут использоваться как на сервере, так и на клиенте
 */

/**
 * Рассчитывает итоговую сумму заказа с учетом скидки
 */
export function calculateOrderTotal(totalAmount: number | null, discount: number): number {
  return (totalAmount || 0) - discount;
}

/**
 * Рассчитывает остаток к оплате
 */
export function calculateRemainingAmount(
  totalAmount: number | null,
  discount: number,
  paidAmount: number
): number {
  const total = calculateOrderTotal(totalAmount, discount);
  return Math.max(0, total - paidAmount);
}

/**
 * Проверяет, полностью ли оплачен заказ
 */
export function isOrderFullyPaid(
  totalAmount: number | null,
  discount: number,
  paidAmount: number
): boolean {
  const total = calculateOrderTotal(totalAmount, discount);
  return paidAmount >= total;
}


