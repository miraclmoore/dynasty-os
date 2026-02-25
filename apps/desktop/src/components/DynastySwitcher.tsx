import React, { useState, useRef, useEffect } from 'react';
import { useDynastyStore } from '../store';

export function DynastySwitcher() {
  const dynasties = useDynastyStore((s) => s.dynasties);
  const activeDynasty = useDynastyStore((s) => s.activeDynasty);
  const switchDynasty = useDynastyStore((s) => s.switchDynasty);
  const setActiveDynasty = useDynastyStore((s) => s.setActiveDynasty);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="max-w-[180px] truncate">
          {activeDynasty?.name ?? 'Select Dynasty'}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {dynasties.map((d) => (
              <button
                key={d.id}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-700 ${
                  d.id === activeDynasty?.id ? 'text-blue-400 bg-gray-750' : 'text-gray-300'
                }`}
                onClick={() => {
                  switchDynasty(d);
                  setOpen(false);
                }}
              >
                <div className="font-medium truncate">{d.name}</div>
                <div className="text-xs text-gray-500 truncate">{d.teamName}</div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-700">
            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
              onClick={() => {
                setActiveDynasty(null);
                setOpen(false);
              }}
            >
              Back to Launcher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
