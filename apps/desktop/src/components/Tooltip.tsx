import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';

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
  const [clampedPosition, setClampedPosition] = useState<Position | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

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
          top = rect.top - gap;
          left = rect.left + rect.width / 2;
        }

        setClampedPosition(null);
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
    setClampedPosition(null);
  }, []);

  // After the tooltip renders, measure its actual visual bounds (getBoundingClientRect
  // accounts for CSS transforms) and clamp to keep it inside the viewport.
  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 8;
    let { top, left } = position;
    let changed = false;

    if (tip.right > vw - PAD) { left -= tip.right - (vw - PAD); changed = true; }
    if (tip.left < PAD) { left += PAD - tip.left; changed = true; }
    if (tip.top < PAD) { top += PAD - tip.top; changed = true; }
    if (tip.bottom > vh - PAD) { top -= tip.bottom - (vh - PAD); changed = true; }

    if (changed) setClampedPosition({ top, left });
  }, [visible, position]);

  const displayPos = clampedPosition ?? position;

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
          ref={tooltipRef}
          style={{ position: 'fixed', top: displayPos.top, left: displayPos.left }}
          className={`z-[9999] px-2.5 py-1.5 text-xs text-gray-100 bg-gray-700 border border-gray-600 rounded-lg whitespace-nowrap pointer-events-none shadow-lg ${transformClasses[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
