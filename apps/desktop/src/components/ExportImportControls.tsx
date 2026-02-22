import React, { useRef, useState } from 'react';
import { useDynastyStore } from '../store';

export function ExportImportControls() {
  const importDynastyFromFile = useDynastyStore((s) => s.importDynastyFromFile);
  const loading = useDynastyStore((s) => s.loading);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so same file can be imported again
    e.target.value = '';
    setStatus(null);

    try {
      await importDynastyFromFile(file);
      setStatus({ type: 'success', message: 'Dynasty imported successfully.' });
      // Clear message after 4 seconds
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus({ type: 'error', message: String(err) });
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm transition-colors disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          Import Dynasty
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {status && (
        <p
          className={`text-xs px-3 py-1.5 rounded-lg ${
            status.type === 'success'
              ? 'text-green-400 bg-green-900/30 border border-green-800'
              : 'text-red-400 bg-red-900/30 border border-red-800'
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
