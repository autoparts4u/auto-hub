'use server';

import { auth } from '@/lib/auth';
import db from '@/lib/db/db';
import { revalidatePath } from 'next/cache';
import {
  calculateOrderTotal,
  calculateRemainingAmount,
  isOrderFullyPaid,
} from '@/lib/utils/orderPaymentUtils';

// Реэкспортируем утилиты для удобства
export { calculateOrderTotal, calculateRemainingAmount, isOrderFullyPaid };

/**
 * Добавляет частичную оплату к заказу
 */
export async function addPartialPayment(orderId: string, amount: number) {
  try {
    // Проверка аутентификации
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return {
        success: false,
        error: 'Недостаточно прав для выполнения операции',
      };
    }

    // Валидация суммы
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Некорректная сумма оплаты',
      };
    }

    // Получаем текущий заказ
    const order = await db.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        discount: true,
        paidAmount: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Заказ не найден',
      };
    }

    // Рассчитываем новую сумму оплаты
    const currentPaidAmount = order.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + amount;
    const orderTotal = calculateOrderTotal(order.totalAmount, order.discount);

    // Проверяем, не превышает ли оплата общую сумму
    if (newPaidAmount > orderTotal) {
      return {
        success: false,
        error: `Сумма оплаты превышает остаток. Максимум: ${(orderTotal - currentPaidAmount).toFixed(2)}`,
      };
    }

    // Определяем, стал ли заказ полностью оплаченным
    const isFullyPaid = newPaidAmount >= orderTotal;

    // Обновляем заказ
    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        // Автоматически устанавливаем paidAt при полной оплате
        paidAt: isFullyPaid ? new Date() : undefined,
      },
      include: {
        client: true,
        orderStatus: true,
      },
    });

    // Ревалидируем кеш страниц
    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true,
      data: {
        order: updatedOrder,
        addedAmount: amount,
        newPaidAmount,
        remainingAmount: orderTotal - newPaidAmount,
        isFullyPaid,
      },
    };
  } catch (error) {
    console.error('Error adding partial payment:', error);
    return {
      success: false,
      error: 'Ошибка при добавлении оплаты',
    };
  }
}

/**
 * Устанавливает полную оплату заказа
 */
export async function markOrderAsFullyPaid(orderId: string) {
  try {
    // Проверка аутентификации
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return {
        success: false,
        error: 'Недостаточно прав для выполнения операции',
      };
    }

    // Получаем текущий заказ
    const order = await db.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        discount: true,
        paidAmount: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Заказ не найден',
      };
    }

    const orderTotal = calculateOrderTotal(order.totalAmount, order.discount);

    // Обновляем заказ
    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        paidAmount: orderTotal,
        paidAt: new Date(),
      },
      include: {
        client: true,
        orderStatus: true,
      },
    });

    // Ревалидируем кеш страниц
    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true,
      data: {
        order: updatedOrder,
        paidAmount: orderTotal,
      },
    };
  } catch (error) {
    console.error('Error marking order as fully paid:', error);
    return {
      success: false,
      error: 'Ошибка при установке полной оплаты',
    };
  }
}

/**
 * Сбрасывает оплату заказа (для отмены оплаты)
 */
export async function resetOrderPayment(orderId: string) {
  try {
    // Проверка аутентификации
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return {
        success: false,
        error: 'Недостаточно прав для выполнения операции',
      };
    }

    // Обновляем заказ
    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        paidAmount: 0,
        paidAt: null,
      },
      include: {
        client: true,
        orderStatus: true,
      },
    });

    // Ревалидируем кеш страниц
    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true,
      data: {
        order: updatedOrder,
      },
    };
  } catch (error) {
    console.error('Error resetting order payment:', error);
    return {
      success: false,
      error: 'Ошибка при сбросе оплаты',
    };
  }
}

/**
 * Получает информацию об оплате заказа
 */
export async function getOrderPaymentInfo(orderId: string) {
  try {
    const order = await db.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        discount: true,
        paidAmount: true,
        paidAt: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Заказ не найден',
      };
    }

    const orderTotal = calculateOrderTotal(order.totalAmount, order.discount);
    const remainingAmount = calculateRemainingAmount(
      order.totalAmount,
      order.discount,
      order.paidAmount || 0
    );
    const isFullyPaid = isOrderFullyPaid(
      order.totalAmount,
      order.discount,
      order.paidAmount || 0
    );

    return {
      success: true,
      data: {
        orderId: order.id,
        totalAmount: order.totalAmount,
        discount: order.discount,
        orderTotal,
        paidAmount: order.paidAmount || 0,
        remainingAmount,
        isFullyPaid,
        paidAt: order.paidAt,
        client: order.client,
      },
    };
  } catch (error) {
    console.error('Error getting order payment info:', error);
    return {
      success: false,
      error: 'Ошибка при получении информации об оплате',
    };
  }
}

