import { appDataDir } from '@tauri-apps/api/path';
import { writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { exportDynasty } from './export-import';

const AUTO_EXPORT_KEY = (dynastyId: string) => `dynasty-os-autoexport-${dynastyId}`;

export function isAutoExportEnabled(dynastyId: string): boolean {
  return localStorage.getItem(AUTO_EXPORT_KEY(dynastyId)) === 'true';
}

export function setAutoExportEnabled(dynastyId: string, enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(AUTO_EXPORT_KEY(dynastyId), 'true');
  } else {
    localStorage.removeItem(AUTO_EXPORT_KEY(dynastyId));
  }
}

export async function autoExportIfEnabled(dynastyId: string, dynastyName: string): Promise<void> {
  if (!isAutoExportEnabled(dynastyId)) return;
  // Fire-and-forget IIFE — never await this function at call site
  (async () => {
    try {
      const appDir = await appDataDir();
      const exportDir = `${appDir}/exports`;
      await mkdir(exportDir, { recursive: true });
      const json = await exportDynasty(dynastyId);
      const safeName = dynastyName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      await writeTextFile(`${exportDir}/${safeName}-latest.json`, json);
    } catch {
      // Never block UI — auto-export failure is silent
    }
  })();
}
