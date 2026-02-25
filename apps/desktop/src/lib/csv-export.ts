import Papa from 'papaparse';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Export an array of plain objects to a CSV file via the OS save dialog.
 * Uses papaparse for RFC 4180-compliant CSV (headers inferred from first row keys).
 * Uses writeTextFile (fs:allow-write-text-file permission already present in capabilities/default.json).
 * Note: Do NOT use writeFile (binary) — only writeTextFile is permitted for text export.
 */
export async function exportTableToCsv(
  rows: Record<string, unknown>[],
  filename: string
): Promise<void> {
  if (rows.length === 0) return;
  const csv = Papa.unparse(rows);
  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return; // user cancelled — not an error
  await writeTextFile(filePath, csv);
}
