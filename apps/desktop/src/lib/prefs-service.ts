import { load, type Store } from '@tauri-apps/plugin-store';
import { usePrefsStore, type KeyMoment, type WizardState } from '../store/prefs-store';

const STORE_FILE = 'dynasty-os.bin'; // SEC-02 canonical

let storePromise: Promise<Store> | null = null;
async function getStore(): Promise<Store> {
  if (!storePromise) storePromise = load(STORE_FILE, { defaults: {}, autoSave: true });
  return storePromise;
}

// ── API Key (D-02, D-11) ───────────────────────────────────────────────────

export async function getApiKey(): Promise<string | null> {
  try {
    const store = await getStore();
    return (await store.get<string>('anthropic-api-key')) ?? null;
  } catch { return null; }
}

export async function setApiKey(key: string): Promise<void> {
  try {
    const store = await getStore();
    await store.set('anthropic-api-key', key);
    usePrefsStore.getState().setHasApiKey(true);
  } catch {}
}

export async function clearApiKey(): Promise<void> {
  try {
    const store = await getStore();
    await store.delete('anthropic-api-key');
    usePrefsStore.getState().setHasApiKey(false);
  } catch {}
}

// ── Migration (D-01) ────────────────────────────────────────────────────────

export async function migrateApiKey(): Promise<void> {
  try {
    const legacyKey = localStorage.getItem('dynasty-os-anthropic-api-key');
    if (legacyKey) {
      await setApiKey(legacyKey);
      localStorage.removeItem('dynasty-os-anthropic-api-key');
    }
  } catch {}
}

// ── Madden Save Path (D-10) ────────────────────────────────────────────────

export async function getMaddenSavePath(): Promise<string | null> {
  try {
    const store = await getStore();
    return (await store.get<string>('madden-save-path')) ?? null;
  } catch { return null; }
}
export async function setMaddenSavePath(path: string): Promise<void> {
  try {
    const store = await getStore();
    await store.set('madden-save-path', path);
    usePrefsStore.getState().setMaddenSavePath(path);
  } catch {}
}
export async function clearMaddenSavePath(): Promise<void> {
  try {
    const store = await getStore();
    await store.delete('madden-save-path');
    usePrefsStore.getState().setMaddenSavePath(null);
  } catch {}
}

// ── Madden Watcher (D-10) ──────────────────────────────────────────────────

export async function getMaddenWatcherEnabled(): Promise<boolean> {
  try {
    const store = await getStore();
    return (await store.get<boolean>('madden-watcher-enabled')) ?? false;
  } catch { return false; }
}
export async function setMaddenWatcherEnabled(enabled: boolean): Promise<void> {
  try {
    const store = await getStore();
    await store.set('madden-watcher-enabled', enabled);
    usePrefsStore.getState().setMaddenWatcherEnabled(enabled);
  } catch {}
}

// ── Auto-export (D-10, keyed by dynastyId) ─────────────────────────────────

export async function getAutoExportEnabled(dynastyId: string): Promise<boolean> {
  try {
    const store = await getStore();
    return (await store.get<boolean>(`auto-export-${dynastyId}`)) ?? false;
  } catch { return false; }
}
export async function setAutoExportEnabled(dynastyId: string, enabled: boolean): Promise<void> {
  try {
    const store = await getStore();
    await store.set(`auto-export-${dynastyId}`, enabled);
    usePrefsStore.getState().setAutoExportEnabled(dynastyId, enabled);
  } catch {}
}

// ── Setup Wizard State (D-10, keyed by dynastyId) ─────────────────────────

export async function getSetupWizardState(dynastyId: string): Promise<WizardState | null> {
  try {
    const store = await getStore();
    return (await store.get<WizardState>(`setup-wizard-${dynastyId}`)) ?? null;
  } catch { return null; }
}
export async function setSetupWizardState(dynastyId: string, state: WizardState): Promise<void> {
  try {
    const store = await getStore();
    await store.set(`setup-wizard-${dynastyId}`, state);
    usePrefsStore.getState().setSetupWizardState(dynastyId, state);
  } catch {}
}

// ── Tour Complete (D-10) ───────────────────────────────────────────────────

export async function getTourComplete(): Promise<boolean> {
  try {
    const store = await getStore();
    return (await store.get<boolean>('tour-complete')) ?? false;
  } catch { return false; }
}
export async function setTourComplete(v: boolean): Promise<void> {
  try {
    const store = await getStore();
    await store.set('tour-complete', v);
    usePrefsStore.getState().setTourComplete(v);
  } catch {}
}

// ── Onboarding Complete (D-10) ─────────────────────────────────────────────

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const store = await getStore();
    return (await store.get<boolean>('onboarding-complete')) ?? false;
  } catch { return false; }
}
export async function setOnboardingComplete(v: boolean): Promise<void> {
  try {
    const store = await getStore();
    await store.set('onboarding-complete', v);
    usePrefsStore.getState().setOnboardingComplete(v);
  } catch {}
}

// ── Checklist (D-10, keyed by seasonId) ────────────────────────────────────

export async function getChecklistState(seasonId: string): Promise<Record<string, boolean>> {
  try {
    const store = await getStore();
    return (await store.get<Record<string, boolean>>(`checklist-${seasonId}`)) ?? {};
  } catch { return {}; }
}
export async function setChecklistState(seasonId: string, state: Record<string, boolean>): Promise<void> {
  try {
    const store = await getStore();
    await store.set(`checklist-${seasonId}`, state);
    usePrefsStore.getState().setChecklistState(seasonId, state);
  } catch {}
}

// ── Rival Key Moments (D-08, keyed by rivalId) ─────────────────────────────

export async function getRivalKeyMoments(rivalId: string): Promise<KeyMoment[]> {
  try {
    const store = await getStore();
    return (await store.get<KeyMoment[]>(`rival-moments-${rivalId}`)) ?? [];
  } catch { return []; }
}
export async function setRivalKeyMoments(rivalId: string, moments: KeyMoment[]): Promise<void> {
  try {
    const store = await getStore();
    await store.set(`rival-moments-${rivalId}`, moments);
    usePrefsStore.getState().setRivalKeyMoments(rivalId, moments);
  } catch {}
}

// ── Eager bootstrap at App.tsx startup (D-06) ─────────────────────────────

export async function loadAll(): Promise<void> {
  try {
    const store = await getStore();
    const apiKey = await store.get<string>('anthropic-api-key');
    const maddenSavePath = await store.get<string>('madden-save-path');
    const maddenWatcherEnabled = await store.get<boolean>('madden-watcher-enabled');
    const tourComplete = await store.get<boolean>('tour-complete');
    const onboardingComplete = await store.get<boolean>('onboarding-complete');

    // Per-key (dynasty/season/rival) values are loaded lazily on first access in
    // their service callsites. loadAll only populates non-keyed singletons here.
    usePrefsStore.setState({
      hasApiKey: Boolean(apiKey),
      maddenSavePath: maddenSavePath ?? null,
      maddenWatcherEnabled: Boolean(maddenWatcherEnabled),
      tourComplete: Boolean(tourComplete),
      onboardingComplete: Boolean(onboardingComplete),
    });

    // auto-export flags are keyed by dynastyId and must be eager because
    // isAutoExportEnabled() is a sync call. Enumerate all auto-export-* keys now.
    // (T-20-20: malformed values are coerced to false via Boolean())
    try {
      const allEntries = await store.entries();
      const autoExportMap: Record<string, boolean> = {};
      for (const [key, val] of allEntries) {
        if (key.startsWith('auto-export-')) {
          const dynastyId = key.slice('auto-export-'.length);
          autoExportMap[dynastyId] = Boolean(val);
        }
      }
      usePrefsStore.setState({ autoExportEnabled: autoExportMap });
    } catch {}
  } catch {}
}
