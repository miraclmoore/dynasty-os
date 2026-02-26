import React, { useRef, useState, useCallback } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'right';
}

interface Position {
  top: number;
  left: number;
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const gap = 6;
        let top = 0;
        let left = 0;

        if (side === 'right') {
          top = rect.top + rect.height / 2;
          left = rect.right + gap;
        } else if (side === 'bottom') {
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2;
        } else {
          // top
          top = rect.top - gap;
          left = rect.left + rect.width / 2;
        }

        setPosition({ top, left });
      }
      setVisible(true);
    }, 150);
  }, [side]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const transformClasses: Record<string, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    right: '-translate-y-1/2',
  };

  return (
    <span
      ref={containerRef}
      className="block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <span
          style={{ position: 'fixed', top: position.top, left: position.left }}
          className={`z-[9999] px-2.5 py-1.5 text-xs text-gray-100 bg-gray-700 border border-gray-600 rounded-lg whitespace-nowrap pointer-events-none shadow-lg ${transformClasses[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
