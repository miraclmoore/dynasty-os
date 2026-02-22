import React, { useState, useRef, useEffect } from 'react';

interface InlineEditCellProps {
  value: string | number;
  onSave: (newValue: string) => void;
  type?: 'text' | 'number';
  className?: string;
}

export function InlineEditCell({ value, onSave, type = 'text', className = '' }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue when value prop changes (e.g. after save + reload)
  useEffect(() => {
    if (!editing) {
      setInputValue(String(value));
    }
  }, [value, editing]);

  const startEditing = () => {
    setInputValue(String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    onSave(inputValue);
  };

  const cancel = () => {
    setInputValue(String(value));
    setEditing(false);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        onBlur={commit}
        className="bg-gray-700 text-white border border-blue-500 rounded px-2 py-1 w-16 text-sm"
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${className}`}
    >
      {value}
    </span>
  );
}
