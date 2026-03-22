'use client';

interface TickerProps {
  text: string;
}

export function Ticker({ text }: TickerProps) {
  if (!text) return null;

  return (
    <div className="w-full overflow-hidden bg-amber-400 dark:bg-amber-600 border-b border-amber-500 dark:border-amber-700 py-1.5 select-none">
      <span className="ticker-track text-sm font-medium text-amber-950 dark:text-amber-50">
        {text}
      </span>
    </div>
  );
}
