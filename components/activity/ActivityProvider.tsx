"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

interface ActivityContextValue {
  logEvent: (type: string, payload?: object) => void;
}

const ActivityContext = createContext<ActivityContextValue>({
  logEvent: () => {},
});

export function useActivity() {
  return useContext(ActivityContext);
}

export function ActivityProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  const logEvent = useCallback(
    (type: string, payload?: object) => {
      fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, payload }),
      }).catch(() => {});
    },
    [sessionId]
  );

  // Heartbeat каждые 3 минуты — держит сессию живой
  useEffect(() => {
    const tick = () => {
      fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };

    const interval = setInterval(tick, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Логируем page_view при каждой смене маршрута
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    logEvent("page_view", { path: pathname });
  }, [pathname, logEvent]);

  return (
    <ActivityContext.Provider value={{ logEvent }}>
      {children}
    </ActivityContext.Provider>
  );
}
