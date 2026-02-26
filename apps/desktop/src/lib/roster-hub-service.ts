// ── Roster Hub Service ────────────────────────────────────────────────────────
// Fetches the live community roster manifest from GitHub with a 24h localStorage
// cache. Falls back to bundled entries on network failure.

import { BUNDLED_ROSTERS, type RosterEntry } from './roster-hub-data';

// Update this constant once the repo is pushed to GitHub.
const MANIFEST_URL =
  'https://raw.githubusercontent.com/miraclmoore/dynasty-os/main/community/rosters.json';

const CACHE_KEY = 'dynasty-os-roster-manifest';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ManifestPayload {
  lastUpdated: string;
  rosters: RosterEntry[];
}

interface ManifestCache {
  fetchedAt: number;
  lastUpdated: string;
  entries: RosterEntry[];
}

export interface RosterResult {
  entries: RosterEntry[];
  /** Unix ms timestamp when the data was fetched, or null when using bundled fallback */
  fetchedAt: number | null;
  /** True when data came from a successful network fetch or a still-valid cache */
  isLive: boolean;
}

function readCache(): ManifestCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ManifestCache;
  } catch {
    return null;
  }
}

function writeCache(cache: ManifestCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage quota exceeded — not fatal
  }
}

export async function getRosters(): Promise<RosterResult> {
  // 1. Check cache first
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { entries: cached.entries, fetchedAt: cached.fetchedAt, isLive: true };
  }

  // 2. Attempt live fetch
  try {
    const res = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = (await res.json()) as ManifestPayload;

    const newCache: ManifestCache = {
      fetchedAt: Date.now(),
      lastUpdated: payload.lastUpdated ?? '',
      entries: payload.rosters ?? [],
    };
    writeCache(newCache);
    return { entries: newCache.entries, fetchedAt: newCache.fetchedAt, isLive: true };
  } catch {
    // 3. Network failed — return stale cache if available, else bundled fallback
    if (cached) {
      return { entries: cached.entries, fetchedAt: cached.fetchedAt, isLive: false };
    }
    return { entries: BUNDLED_ROSTERS, fetchedAt: null, isLive: false };
  }
}
