import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

interface LegacyCardExportProps {
  cardRef: React.RefObject<HTMLDivElement>;
  playerLastName: string;
}

/**
 * Button that exports the LegacyCard DOM node to a PNG file using Tauri-safe
 * file saving (plugin-dialog save() + plugin-fs writeFile()).
 *
 * IMPORTANT: Do NOT use blob URLs or anchor.click() — blocked in Tauri WebView
 * (WKWebView on macOS, WebView2 on Windows).
 */
export function LegacyCardExport({ cardRef, playerLastName }: LegacyCardExportProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!cardRef.current) return;

    setExporting(true);
    setError(null);

    try {
      // 1. Render card to PNG data URL
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2, // 2x for crisp export
        backgroundColor: undefined, // keep transparency / card background
      });

      // 2. Convert data URL to Uint8Array
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Ask user where to save (Tauri file dialog)
      const filePath = await save({
        defaultPath: `${playerLastName}-legacy-card.png`,
        filters: [
          {
            name: 'PNG Image',
            extensions: ['png'],
          },
        ],
      });

      if (!filePath) {
        // User cancelled — not an error
        setExporting(false);
        return;
      }

      // 4. Write binary file via Tauri fs plugin
      await writeFile(filePath, bytes);
    } catch (err) {
      console.error('[LegacyCardExport] Export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        {exporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PNG
          </>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  );
}
