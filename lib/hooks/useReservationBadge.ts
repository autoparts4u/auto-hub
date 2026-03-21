'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'reservations_last_seen';
const POLL_INTERVAL = 30_000;
export const RESERVATIONS_READ_EVENT = 'reservations-marked-read';

export function useReservationBadge() {
  const [count, setCount] = useState(0);
  const isFirstPoll = useRef(true);
  const prevCount = useRef(0);

  const check = useCallback(async () => {
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();
      const res = await fetch(`/api/reservations/count?since=${encodeURIComponent(lastSeen)}`);
      if (!res.ok) return;

      const { count: newCount, newest } = await res.json();

      // Показываем тост только при появлении новых резерваций после первого опроса
      if (!isFirstPoll.current && newCount > prevCount.current && newest) {
        const added = newCount - prevCount.current;
        toast(
          added === 1
            ? `Новое бронирование от ${newest.client}`
            : `${added} новых бронирования`,
          {
            description: (
              `🔖 ${newest.article} · ${newest.quantity} шт.`
            ),
            duration: 6000,
            classNames: {
              toast: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
              title: 'text-blue-900 dark:text-blue-100 font-semibold',
              description: 'text-blue-800 dark:text-blue-200 font-medium',
            },
            action: { label: 'Открыть', onClick: () => { window.location.href = '/dashboard/reservations'; } },
          }
        );
      }

      isFirstPoll.current = false;
      prevCount.current = newCount;
      setCount(newCount);
    } catch {
      // игнорируем ошибки сети
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  // Слушаем событие "прочитано" от страницы бронирований
  useEffect(() => {
    const handleRead = () => {
      prevCount.current = 0;
      setCount(0);
    };
    window.addEventListener(RESERVATIONS_READ_EVENT, handleRead);
    return () => window.removeEventListener(RESERVATIONS_READ_EVENT, handleRead);
  }, []);

  const markAsRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    prevCount.current = 0;
    setCount(0);
    window.dispatchEvent(new CustomEvent(RESERVATIONS_READ_EVENT));
  }, []);

  return { count, markAsRead };
}
