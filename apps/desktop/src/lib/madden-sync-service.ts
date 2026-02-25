import { Command } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { createGame, getGamesBySeason } from './game-service';
import { createPlayer, getPlayersByDynasty } from './player-service';
import { createPlayerSeason, getPlayerSeasonsByDynasty } from './player-season-service';
import { createDraftPick } from './draft-service';
import type { GameResult, HomeAway, GameType } from '@dynasty-os/core-types';

// ── SIDECAR KEY ───────────────────────────────────────────────────────────────

const SIDECAR = 'binaries/madden-reader';
const STORAGE_KEY_SAVE_PATH = 'dynasty-os-madden-save-path';
const STORAGE_KEY_WATCHER = 'dynasty-os-madden-watcher-enabled';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidateResult {
  valid: boolean;
  gameYear: number | null;
  yearShort: number | null;
  supported: boolean;
  unsupportedReason: string | null;
  error?: string;
  message?: string;
}

export interface RawGame {
  week: number | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  gameType: string | null;
}

export interface RawPlayer {
  name: string | null;
  position: string | null;
  overall: number | null;
  age: number | null;
  jerseyNumber: number | null;
}

export interface RawDraftPick {
  round: number | null;
  pick: number | null;
  team: string | null;
}

export interface ExtractResult {
  gameYear: number | null;
  games: RawGame[];
  players: RawPlayer[];
  draftPicks: RawDraftPick[];
  error?: string;
  message?: string;
}

/** A game entry that has been resolved to Dynasty OS's data model */
export interface MappedGame {
  week: number;
  opponent: string;
  homeAway: HomeAway;
  teamScore: number;
  opponentScore: number;
  result: GameResult;
  gameType: GameType;
}

export interface PackageVersionInfo {
  installed: string | null;
  latest: string | null;
  updateAvailable: boolean;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  version?: string;
  error?: string;
}

/** Confirmation diff shown before committing */
export interface SyncDiff {
  gamesToAdd: MappedGame[];
  gamesSkipped: number; // already exist in DB (by week)
  playersToAdd: RawPlayer[];
  playersSkipped: number;
  draftPicksToAdd: RawDraftPick[];
  draftPicksSkipped: number;
  gameYear: number | null;
}

// ── Save file path storage ────────────────────────────────────────────────────

export function getStoredSavePath(): string | null {
  return localStorage.getItem(STORAGE_KEY_SAVE_PATH);
}

export function storeSavePath(path: string): void {
  localStorage.setItem(STORAGE_KEY_SAVE_PATH, path);
}

export function clearSavePath(): void {
  localStorage.removeItem(STORAGE_KEY_SAVE_PATH);
}

export function isWatcherEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY_WATCHER) === 'true';
}

export function setWatcherEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(STORAGE_KEY_WATCHER, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_WATCHER);
  }
}

// ── File picker ───────────────────────────────────────────────────────────────

/** Open the OS file dialog filtered to .frs files. Returns path or null. */
export async function pickSaveFile(): Promise<string | null> {
  const selected = await openDialog({
    title: 'Select Madden Franchise Save File',
    filters: [{ name: 'Madden Franchise Save', extensions: ['frs'] }],
    multiple: false,
    directory: false,
  });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

// ── Sidecar invocation ────────────────────────────────────────────────────────

/** Run the sidecar and collect stdout as a JSON string. Never throws. */
async function runSidecar(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    let output = '';
    const command = Command.sidecar(SIDECAR, args);
    command.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    command.on('close', () => resolve(output));
    command.on('error', (err) => {
      resolve(JSON.stringify({ error: 'sidecar_error', message: String(err) }));
    });
    command.spawn().catch((err) => {
      resolve(JSON.stringify({ error: 'spawn_error', message: String(err) }));
    });
  });
}

// ── Validate ──────────────────────────────────────────────────────────────────

/**
 * Validates a Madden .frs save file.
 * Returns ValidateResult. Never throws.
 */
export async function validateSaveFile(filePath: string): Promise<ValidateResult> {
  try {
    const raw = await runSidecar(['validate', filePath]);
    const parsed = JSON.parse(raw.trim());
    return parsed as ValidateResult;
  } catch {
    return {
      valid: false,
      gameYear: null,
      yearShort: null,
      supported: false,
      unsupportedReason: null,
      error: 'parse_error',
      message: 'Could not parse sidecar response. Check that Node.js is installed and madden-franchise deps are present.',
    };
  }
}

// ── Extract ───────────────────────────────────────────────────────────────────

/**
 * Extracts game results, roster, and draft data from a validated .frs file.
 * Returns ExtractResult. Never throws.
 */
export async function extractSaveData(filePath: string): Promise<ExtractResult> {
  try {
    const raw = await runSidecar(['extract', filePath]);
    const parsed = JSON.parse(raw.trim());
    return parsed as ExtractResult;
  } catch {
    return {
      gameYear: null,
      games: [],
      players: [],
      draftPicks: [],
      error: 'parse_error',
      message: 'Could not parse extraction output.',
    };
  }
}

// ── Package version check ─────────────────────────────────────────────────────

/**
 * Returns the installed and latest npm versions of madden-franchise.
 * Never throws.
 */
export async function checkMaddenPackageVersion(): Promise<PackageVersionInfo> {
  try {
    const raw = await runSidecar(['version']);
    const parsed = JSON.parse(raw.trim());
    if (parsed.error) {
      return { installed: null, latest: null, updateAvailable: false, error: parsed.message };
    }
    const installed = parsed.version as string;

    const res = await fetch('https://registry.npmjs.org/madden-franchise/latest');
    if (!res.ok) {
      return { installed, latest: null, updateAvailable: false };
    }
    const data = await res.json() as { version: string };
    const latest = data.version;
    return { installed, latest, updateAvailable: installed !== latest };
  } catch {
    return { installed: null, latest: null, updateAvailable: false, error: 'Version check failed' };
  }
}

/**
 * Runs `npm install madden-franchise@latest` inside the sidecar directory.
 * Never throws.
 */
export async function updateMaddenPackage(): Promise<UpdateResult> {
  try {
    const raw = await runSidecar(['update']);
    const parsed = JSON.parse(raw.trim());
    if (parsed.error) return { success: false, error: parsed.message };
    return { success: true, version: parsed.version };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Diff computation ──────────────────────────────────────────────────────────

/** Resolve gameType string from Madden to Dynasty OS GameType */
function resolveGameType(raw: string | null): GameType {
  if (!raw) return 'regular';
  const lower = raw.toLowerCase();
  if (lower.includes('playoff') || lower.includes('post')) return 'playoff';
  if (lower.includes('bowl') || lower.includes('super')) return 'playoff';
  if (lower.includes('exhibition') || lower.includes('preseason')) return 'exhibition';
  return 'regular';
}

/**
 * Compute the confirmation diff: what will be added vs already exists.
 * teamName = activeDynasty.teamName (used to identify which side is "us")
 */
export async function computeSyncDiff(
  extracted: ExtractResult,
  seasonId: string,
  dynastyId: string,
  teamName: string
): Promise<SyncDiff> {
  const existingGames = await getGamesBySeason(seasonId);
  const existingWeeks = new Set(existingGames.map((g) => g.week));

  const existingPlayers = await getPlayersByDynasty(dynastyId);
  const existingNames = new Set(
    existingPlayers.map((p) => `${p.firstName} ${p.lastName}`.toLowerCase())
  );

  const existingSeasons = await getPlayerSeasonsByDynasty(dynastyId);
  const existingPlayerIds = new Set(existingSeasons.map((s) => s.playerId));

  const teamLower = teamName.toLowerCase();

  // Map raw games → Dynasty OS games
  const gamesToAdd: MappedGame[] = [];
  let gamesSkipped = 0;

  for (const g of extracted.games) {
    if (!g.homeScore || !g.awayScore || g.week === null) {
      gamesSkipped++;
      continue;
    }
    if (existingWeeks.has(g.week)) {
      gamesSkipped++;
      continue;
    }

    const homeTeamLower = (g.homeTeam ?? '').toLowerCase();
    const awayTeamLower = (g.awayTeam ?? '').toLowerCase();

    let homeAway: HomeAway;
    let teamScore: number;
    let opponentScore: number;
    let opponent: string;

    // Try to match by teamName substring
    if (homeTeamLower.includes(teamLower) || teamLower.includes(homeTeamLower)) {
      homeAway = 'home';
      teamScore = g.homeScore;
      opponentScore = g.awayScore;
      opponent = g.awayTeam ?? 'Unknown';
    } else if (awayTeamLower.includes(teamLower) || teamLower.includes(awayTeamLower)) {
      homeAway = 'away';
      teamScore = g.awayScore;
      opponentScore = g.homeScore;
      opponent = g.homeTeam ?? 'Unknown';
    } else {
      // Can't identify our team — skip this game
      gamesSkipped++;
      continue;
    }

    const result: GameResult = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';

    gamesToAdd.push({
      week: g.week,
      opponent,
      homeAway,
      teamScore,
      opponentScore,
      result,
      gameType: resolveGameType(g.gameType),
    });
  }

  // Map raw players → new players only
  const playersToAdd: RawPlayer[] = [];
  let playersSkipped = 0;

  for (const p of extracted.players) {
    if (!p.name) { playersSkipped++; continue; }
    if (existingNames.has(p.name.toLowerCase())) { playersSkipped++; continue; }
    playersToAdd.push(p);
  }

  // Draft picks — dedupe by round+pick if same season already has entries
  const draftPicksToAdd: RawDraftPick[] = [];
  let draftPicksSkipped = 0;
  for (const dp of extracted.draftPicks) {
    if (dp.round === null && dp.pick === null) { draftPicksSkipped++; continue; }
    draftPicksToAdd.push(dp);
  }

  return {
    gamesToAdd,
    gamesSkipped,
    playersToAdd,
    playersSkipped,
    draftPicksToAdd,
    draftPicksSkipped,
    gameYear: extracted.gameYear,
  };
}

// ── Commit sync ───────────────────────────────────────────────────────────────

export interface CommitResult {
  gamesAdded: number;
  playersAdded: number;
  draftPicksAdded: number;
}

/**
 * Commits the confirmed diff to the Dynasty OS database.
 */
export async function commitSyncDiff(
  diff: SyncDiff,
  seasonId: string,
  dynastyId: string,
  year: number
): Promise<CommitResult> {
  let gamesAdded = 0;
  let playersAdded = 0;
  let draftPicksAdded = 0;

  // Add games
  for (const g of diff.gamesToAdd) {
    await createGame({
      seasonId,
      dynastyId,
      week: g.week,
      opponent: g.opponent,
      homeAway: g.homeAway,
      teamScore: g.teamScore,
      opponentScore: g.opponentScore,
      result: g.result,
      gameType: g.gameType,
      overtime: false,
    });
    gamesAdded++;
  }

  // Add players
  for (const p of diff.playersToAdd) {
    const nameParts = (p.name ?? '').split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const player = await createPlayer({
      dynastyId,
      firstName,
      lastName,
      position: p.position ?? 'Unknown',
      jerseyNumber: p.jerseyNumber ?? undefined,
      status: 'active',
    });
    // Create a PlayerSeason shell for the current year
    if (player) {
      await createPlayerSeason({
        playerId: player.id,
        dynastyId,
        seasonId,
        year,
        stats: p.overall != null ? { overall: p.overall } : {},
      });
    }
    playersAdded++;
  }

  // Add draft picks
  for (const dp of diff.draftPicksToAdd) {
    await createDraftPick({
      dynastyId,
      seasonId,
      year,
      round: dp.round ?? 1,
      pickNumber: dp.pick ?? undefined,
      playerName: '',
      position: '',
      nflTeam: dp.team ?? '',
    });
    draftPicksAdded++;
  }

  return { gamesAdded, playersAdded, draftPicksAdded };
}
